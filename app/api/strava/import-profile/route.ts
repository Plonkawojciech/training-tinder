import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaTokens, userSportProfiles, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { unauthorized, serverError, badRequest, apiError, ErrorCode } from '@/lib/api-errors';
import { refreshStravaTokenIfNeeded } from '@/lib/strava';

function extractAthleteId(stravaUrl: string): string | null {
  const match = stravaUrl.match(/athletes\/(\d+)/);
  if (match) return match[1];
  const numMatch = stravaUrl.trim().match(/^\d+$/);
  if (numMatch) return stravaUrl.trim();
  return null;
}

interface StravaAthlete {
  id: number;
  username: string | null;
  firstname: string;
  lastname: string;
  city: string | null;
  state: string | null;
  country: string | null;
  sex: string | null;
  ftp: number | null;
  weight: number | null;
  measurement_preference: string;
  profile: string | null;
}

interface StravaStats {
  recent_run_totals?: { distance: number; moving_time: number; count: number };
  recent_ride_totals?: { distance: number; moving_time: number; count: number };
  all_run_totals?: { distance: number; count: number };
  all_ride_totals?: { distance: number; count: number };
  ytd_run_totals?: { distance: number; count: number };
  ytd_ride_totals?: { distance: number; count: number };
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json() as { stravaUrl?: string };

    if (!body.stravaUrl) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'stravaUrl is required');
    }

    const athleteId = extractAthleteId(body.stravaUrl);
    if (!athleteId) {
      return badRequest(ErrorCode.INVALID_INPUT, 'Could not extract athlete ID from URL. Expected format: https://www.strava.com/athletes/12345');
    }

    // Check if user has Strava OAuth tokens
    const tokenRows = await db
      .select()
      .from(stravaTokens)
      .where(eq(stravaTokens.userId, userId))
      .limit(1);

    const hasToken = tokenRows.length > 0;
    const stravaConfigured = !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);

    // If we have OAuth token and Strava is configured, use API
    if (hasToken && stravaConfigured) {
      let accessToken: string;
      try {
        accessToken = await refreshStravaTokenIfNeeded(tokenRows[0]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'STRAVA_TOKEN_REVOKED') {
          return NextResponse.json({
            success: false,
            needsReconnect: true,
            message: 'Strava token expired. Please reconnect your Strava account.',
            connectUrl: '/api/strava/connect',
          });
        }
        return apiError(ErrorCode.STRAVA_CONNECTION_ERROR, 'Failed to refresh Strava token', 502);
      }

      // Fetch athlete profile
      const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!athleteRes.ok) {
        return apiError(ErrorCode.STRAVA_CONNECTION_ERROR, 'Failed to fetch Strava athlete data', 502);
      }

      const athlete = await athleteRes.json() as StravaAthlete;

      // Fetch athlete stats
      const statsRes = await fetch(
        `https://www.strava.com/api/v3/athletes/${athlete.id}/stats`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const stats = statsRes.ok ? (await statsRes.json() as StravaStats) : null;

      // Build update payload
      const profileUpdate: Record<string, unknown> = {};
      if (athlete.city) profileUpdate.city = athlete.city;
      if (athlete.ftp) profileUpdate.ftpWatts = athlete.ftp;

      // Calculate weekly km from recent totals (last 4 weeks of running)
      const recentRunM = stats?.recent_run_totals?.distance ?? 0;
      const recentRideM = stats?.recent_ride_totals?.distance ?? 0;

      if (Object.keys(profileUpdate).length > 0) {
        await db
          .update(users)
          .set(profileUpdate as Partial<typeof users.$inferInsert>)
          .where(eq(users.authEmail, userId))
          .catch(() => {});
      }

      // Update sport profiles
      const importedProfiles: Record<string, unknown>[] = [];

      if (recentRunM > 0) {
        const weeklyRunKm = Math.round(recentRunM / 1000 / 4);
        const runProfile = {
          sport: 'running',
          weeklyKm: weeklyRunKm,
        };
        importedProfiles.push(runProfile);

        await db
          .insert(userSportProfiles)
          .values({ userId, sport: 'running', level: 'recreational', weeklyKm: weeklyRunKm, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: [userSportProfiles.userId, userSportProfiles.sport],
            set: { weeklyKm: weeklyRunKm, updatedAt: new Date() },
          })
          .catch(() => {});
      }

      if (recentRideM > 0) {
        const weeklyRideKm = Math.round(recentRideM / 1000 / 4);
        const rideProfile: Record<string, unknown> = {
          sport: 'cycling',
          weeklyKm: weeklyRideKm,
        };
        if (athlete.ftp) rideProfile.ftpWatts = athlete.ftp;
        importedProfiles.push(rideProfile);

        await db
          .insert(userSportProfiles)
          .values({
            userId,
            sport: 'cycling',
            level: 'recreational',
            weeklyKm: weeklyRideKm,
            ftpWatts: athlete.ftp ?? null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [userSportProfiles.userId, userSportProfiles.sport],
            set: {
              weeklyKm: weeklyRideKm,
              ftpWatts: athlete.ftp ?? undefined,
              updatedAt: new Date(),
            },
          })
          .catch(() => {});
      }

      return NextResponse.json({
        success: true,
        athleteId: athlete.id,
        athleteName: `${athlete.firstname} ${athlete.lastname}`.trim(),
        city: athlete.city,
        ftp: athlete.ftp,
        importedProfiles,
        stats: {
          recentRunKm: Math.round(recentRunM / 1000),
          recentRideKm: Math.round(recentRideM / 1000),
          allRunCount: stats?.all_run_totals?.count ?? 0,
          allRideCount: stats?.all_ride_totals?.count ?? 0,
          ytdRunKm: Math.round((stats?.ytd_run_totals?.distance ?? 0) / 1000),
          ytdRideKm: Math.round((stats?.ytd_ride_totals?.distance ?? 0) / 1000),
        },
        message: 'Profile imported from Strava successfully!',
      });
    }

    // No OAuth token — return guidance
    if (!stravaConfigured) {
      return NextResponse.json({
        success: false,
        partial: true,
        athleteId,
        profileUrl: `https://www.strava.com/athletes/${athleteId}`,
        message: 'Strava OAuth is not configured. Please enter your training data manually.',
        instructions: [
          'Visit your Strava profile to view your stats',
          'Enter your FTP, weekly km, and pace manually in your Training Zones page',
          'Ask the app admin to configure STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET for full OAuth',
        ],
      });
    }

    // Has config but no token — prompt OAuth connect
    return NextResponse.json({
      success: false,
      needsConnect: true,
      athleteId,
      profileUrl: `https://www.strava.com/athletes/${athleteId}`,
      message: 'Connect your Strava account to import your profile data automatically.',
      connectUrl: '/api/strava/connect',
    });
  } catch (err) {
    console.error('POST /api/strava/import-profile error:', err);
    return serverError();
  }
}
