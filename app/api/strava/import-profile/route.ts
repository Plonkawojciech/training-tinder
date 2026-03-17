import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaTokens, userSportProfiles, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function extractAthleteId(stravaUrl: string): string | null {
  // Accepts formats:
  // https://www.strava.com/athletes/12345
  // https://strava.com/athletes/12345
  // strava.com/athletes/12345
  // Just a numeric ID: 12345
  const match = stravaUrl.match(/athletes\/(\d+)/);
  if (match) return match[1];

  // Try bare numeric ID
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

async function refreshStravaToken(token: typeof stravaTokens.$inferSelect): Promise<string | null> {
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) return null;

  if (new Date() < new Date(token.expiresAt)) {
    return token.accessToken;
  }

  try {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: token.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };

    await db
      .update(stravaTokens)
      .set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at * 1000),
      })
      .where(eq(stravaTokens.userId, token.userId));

    return data.access_token;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const body = await request.json() as { stravaUrl?: string };

    if (!body.stravaUrl) {
      return NextResponse.json({ error: 'stravaUrl is required' }, { status: 400 });
    }

    const athleteId = extractAthleteId(body.stravaUrl);
    if (!athleteId) {
      return NextResponse.json(
        { error: 'Could not extract athlete ID from URL. Expected format: https://www.strava.com/athletes/12345' },
        { status: 400 }
      );
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
      const accessToken = await refreshStravaToken(tokenRows[0]);

      if (!accessToken) {
        return NextResponse.json({
          success: false,
          needsReconnect: true,
          message: 'Strava token expired. Please reconnect your Strava account.',
          connectUrl: '/api/strava/connect',
        });
      }

      // Fetch athlete profile
      const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!athleteRes.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch Strava athlete data' },
          { status: 502 }
        );
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
          .where(eq(users.clerkId, userId))
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
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
