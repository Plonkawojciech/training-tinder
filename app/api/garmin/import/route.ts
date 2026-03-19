import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { userSportProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { unauthorized, badRequest, ErrorCode } from '@/lib/api-errors';

// ─── Garmin Connect Internal API endpoints ──────────────────────────────────
// These work when session cookies are provided.
const GARMIN_API = 'https://connect.garmin.com/modern/proxy';

interface GarminProfile {
  displayName?: string;
  fullName?: string;
  location?: string;
  vo2Max?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
}

interface GarminStats {
  totalDistanceMeters?: number | null;
  averagePaceSecondsPerKm?: number | null;
  totalActivities?: number | null;
  avgWeeklyDistanceMeters?: number | null;
}

async function fetchWithCookies(url: string, cookieHeader: string) {
  return fetch(url, {
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'X-Requested-With': 'XMLHttpRequest',
      'NK': 'NT',
    },
    signal: AbortSignal.timeout(10000),
  });
}

async function getDisplayNameFromCookies(cookieHeader: string): Promise<string | null> {
  try {
    const res = await fetchWithCookies(`${GARMIN_API}/userprofile-service/userprofile/personal-information`, cookieHeader);
    if (!res.ok) return null;
    const data = await res.json() as { userName?: string; displayName?: string };
    return data.userName ?? data.displayName ?? null;
  } catch {
    return null;
  }
}

async function fetchGarminProfileByCookies(cookieHeader: string): Promise<{
  profile: GarminProfile | null;
  stats: GarminStats | null;
  displayName: string | null;
}> {
  const displayName = await getDisplayNameFromCookies(cookieHeader);
  if (!displayName) return { profile: null, stats: null, displayName: null };

  const [profileRes, statsRes] = await Promise.allSettled([
    fetchWithCookies(`${GARMIN_API}/userprofile-service/socialProfile/${displayName}`, cookieHeader),
    fetchWithCookies(`${GARMIN_API}/userstats-service/statistics/${displayName}/all?fromDate=${getDateMinus90Days()}&untilDate=${getToday()}`, cookieHeader),
  ]);

  let profile: GarminProfile | null = null;
  let stats: GarminStats | null = null;

  if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
    profile = await profileRes.value.json() as GarminProfile;
  }

  if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
    const raw = await statsRes.value.json() as {
      userMetrics?: Array<{ metricId: number; value: number }>;
      totalDistanceMeters?: number;
    };

    // Parse Garmin stats response (metric IDs vary by account)
    const metrics: Record<number, number> = {};
    if (raw.userMetrics) {
      raw.userMetrics.forEach((m: { metricId: number; value: number }) => {
        metrics[m.metricId] = m.value;
      });
    }

    stats = {
      totalDistanceMeters: raw.totalDistanceMeters ?? metrics[2] ?? null,
      averagePaceSecondsPerKm: metrics[16] ?? null,
      totalActivities: metrics[21] ?? null,
      avgWeeklyDistanceMeters: raw.totalDistanceMeters
        ? Math.round(raw.totalDistanceMeters / 13)
        : null, // ~90 days = 13 weeks
    };
  }

  return { profile, stats, displayName };
}

// ─── Public URL scraping (fallback — limited data) ───────────────────────────
function parseHtmlStats(html: string): Partial<GarminStats & GarminProfile> {
  const result: Partial<GarminStats & GarminProfile> = {};

  // VO2max
  const vo2match = html.match(/"vo2Max"\s*:\s*(\d+(?:\.\d+)?)/i) ??
                   html.match(/VO2\s*Max[^<]*<[^>]+>(\d+(?:\.\d+)?)/i);
  if (vo2match) result.vo2Max = parseFloat(vo2match[1]);

  // Weekly distance
  const distMatch = html.match(/(\d+(?:\.\d+)?)\s*km\s*\/\s*week/i) ??
                    html.match(/"weeklyRunningDistance"\s*:\s*(\d+(?:\.\d+)?)/i);
  if (distMatch) result.avgWeeklyDistanceMeters = parseFloat(distMatch[1]) * 1000;

  // Avg HR
  const hrMatch = html.match(/"averageHeartRate"\s*:\s*(\d+)/i) ??
                  html.match(/avg\s*hr[^>]*>\s*(\d+)/i);
  if (hrMatch) result.averageHeartRate = parseInt(hrMatch[1]);

  return result;
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDateMinus90Days() {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split('T')[0];
}

function detectSportFromStats(_: GarminStats | null): string {
  return 'running'; // default; would need activity type breakdown for accuracy
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  let body: {
    garminProfileUrl?: string;
    cookies?: string; // raw Cookie header string from user's browser
    displayName?: string; // Garmin display name / username
    mode?: 'url' | 'cookies' | 'manual';
  };

  try {
    body = await request.json() as typeof body;
  } catch {
    return badRequest(ErrorCode.INVALID_INPUT, 'Invalid request body');
  }

  const { mode = 'url', cookies, garminProfileUrl, displayName } = body;

  // ── MODE 1: Cookie-based (most reliable) ─────────────────────────────────
  if (mode === 'cookies' && cookies) {
    try {
      const { profile, stats, displayName: resolvedName } = await fetchGarminProfileByCookies(cookies);

      if (!resolvedName) {
        return NextResponse.json({
          requiresLogin: true,
          error: { code: 'GARMIN_COOKIES_INVALID' },
        });
      }

      const weeklyKm = stats?.avgWeeklyDistanceMeters
        ? Math.round(stats.avgWeeklyDistanceMeters / 1000)
        : null;
      const vo2max = profile?.vo2Max ?? null;
      const pacePerKmSec = stats?.averagePaceSecondsPerKm ?? null;
      const avgSpeedKmh = pacePerKmSec ? Math.round((3600 / pacePerKmSec) * 10) / 10 : null;
      const sport = detectSportFromStats(stats);

      if (weeklyKm || vo2max || avgSpeedKmh) {
        await upsertSportProfile(userId, sport, { weeklyKm, vo2max, avgSpeedKmh, pacePerKmSec });
      }

      return NextResponse.json({
        success: true,
        displayName: resolvedName,
        weeklyKm,
        vo2max,
        avgSpeedKmh,
        pacePerKmSec,
        sport,
        source: 'garmin_cookies',
      });
    } catch (err) {
      console.error('Garmin cookies import error:', err);
      return NextResponse.json({
        requiresLogin: true,
        error: { code: 'GARMIN_CONNECTION_ERROR' },
      });
    }
  }

  // ── MODE 2: URL scraping (fallback) ──────────────────────────────────────
  const targetUrl = garminProfileUrl ?? (displayName ? `https://connect.garmin.com/modern/profile/${displayName}` : null);

  if (!targetUrl || !targetUrl.includes('garmin.com')) {
    return NextResponse.json({
      requiresLogin: false,
      error: { code: 'GARMIN_URL_OR_LOGIN_REQUIRED' },
      modes: ['cookies', 'url', 'manual'],
    });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401 || response.status === 403 || !response.ok) {
      return NextResponse.json({
        requiresLogin: true,
        error: { code: 'GARMIN_LOGIN_REQUIRED' },
        cookiesInstructions: COOKIES_INSTRUCTIONS,
      });
    }

    const html = await response.text();

    if (html.toLowerCase().includes('sign-in') || html.toLowerCase().includes('log in to garmin')) {
      return NextResponse.json({
        requiresLogin: true,
        error: { code: 'GARMIN_PROFILE_PRIVATE' },
        cookiesInstructions: COOKIES_INSTRUCTIONS,
      });
    }

    const parsed = parseHtmlStats(html);
    const weeklyKm = parsed.avgWeeklyDistanceMeters ? Math.round(parsed.avgWeeklyDistanceMeters / 1000) : null;

    if (weeklyKm ?? parsed.vo2Max) {
      await upsertSportProfile(userId, 'running', {
        weeklyKm,
        vo2max: parsed.vo2Max ?? null,
        avgSpeedKmh: null,
        pacePerKmSec: null,
      });
    }

    return NextResponse.json({
      success: true,
      weeklyKm,
      vo2max: parsed.vo2Max ?? null,
      source: 'garmin_scrape',
      partial: true,
    });
  } catch (err) {
    console.error('Garmin URL import error:', err);
    return NextResponse.json({
      requiresLogin: true,
      error: { code: 'GARMIN_FETCH_FAILED' },
      cookiesInstructions: COOKIES_INSTRUCTIONS,
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function upsertSportProfile(
  userId: string,
  sport: string,
  data: { weeklyKm: number | null; vo2max: number | null; avgSpeedKmh: number | null; pacePerKmSec: number | null }
) {
  const existing = await db
    .select()
    .from(userSportProfiles)
    .where(and(eq(userSportProfiles.userId, userId), eq(userSportProfiles.sport, sport)))
    .limit(1);

  const values = {
    ...(data.weeklyKm !== null && { weeklyKm: data.weeklyKm }),
    ...(data.vo2max !== null && { vo2max: data.vo2max }),
    ...(data.avgSpeedKmh !== null && { avgSpeedKmh: data.avgSpeedKmh }),
    ...(data.pacePerKmSec !== null && { pacePerKmSec: data.pacePerKmSec }),
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db.update(userSportProfiles).set(values)
      .where(and(eq(userSportProfiles.userId, userId), eq(userSportProfiles.sport, sport)));
  } else {
    await db.insert(userSportProfiles).values({ userId, sport, level: 'recreational', ...values });
  }
}

const COOKIES_INSTRUCTIONS = `
How to copy cookies from Garmin Connect:
1. Open connect.garmin.com and log in
2. Open DevTools (F12) → Application → Cookies
3. Copy the values: GARMIN-SSO-GUID, JWT_FG, SESSIONID
4. Paste all as one string: "GARMIN-SSO-GUID=xxx; JWT_FG=yyy; SESSIONID=zzz"
`.trim();
