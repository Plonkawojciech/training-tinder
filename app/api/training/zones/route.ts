import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users, userSportProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { unauthorized, serverError } from '@/lib/api-errors';

export interface PowerZone {
  zone: number;
  name: string;
  minWatts: number;
  maxWatts: number;
  minPct: number;
  maxPct: number;
  color: string;
  description: string;
}

export interface HRZone {
  zone: number;
  name: string;
  minBpm: number;
  maxBpm: number;
  minPct: number;
  maxPct: number;
  color: string;
  description: string;
}

export interface PaceZone {
  zone: number;
  name: string;
  minPaceSec: number;
  maxPaceSec: number;
  minPaceStr: string;
  maxPaceStr: string;
  color: string;
  description: string;
}

function calcPowerZones(ftp: number): PowerZone[] {
  const zones = [
    { zone: 1, name: 'Active Recovery', minPct: 0, maxPct: 55, color: '#4ADE80', description: 'Easy spinning, recovery rides' },
    { zone: 2, name: 'Endurance', minPct: 56, maxPct: 75, color: '#86EFAC', description: 'Aerobic base building, long rides' },
    { zone: 3, name: 'Tempo', minPct: 76, maxPct: 90, color: '#FDE047', description: 'Sustained effort, improves efficiency' },
    { zone: 4, name: 'Sweet Spot', minPct: 88, maxPct: 95, color: '#FB923C', description: 'High training value, race pace prep' },
    { zone: 5, name: 'VO2max', minPct: 106, maxPct: 120, color: '#F97316', description: 'Hard intervals, raises aerobic ceiling' },
    { zone: 6, name: 'Anaerobic', minPct: 121, maxPct: 150, color: '#EF4444', description: 'Short intense efforts, anaerobic capacity' },
    { zone: 7, name: 'Neuromuscular', minPct: 151, maxPct: 999, color: '#DC2626', description: 'Max sprints, neuromuscular power' },
  ];
  return zones.map((z) => ({
    ...z,
    minWatts: Math.round((ftp * z.minPct) / 100),
    maxWatts: z.maxPct === 999 ? 9999 : Math.round((ftp * z.maxPct) / 100),
  }));
}

function calcHRZones(maxHr: number): HRZone[] {
  const zones = [
    { zone: 1, name: 'Recovery', minPct: 0, maxPct: 60, color: '#4ADE80', description: 'Very light, warm-up/cool-down' },
    { zone: 2, name: 'Aerobic Base', minPct: 60, maxPct: 70, color: '#86EFAC', description: 'Fat burning, endurance foundation' },
    { zone: 3, name: 'Aerobic Power', minPct: 70, maxPct: 80, color: '#FDE047', description: 'Aerobic conditioning, moderate effort' },
    { zone: 4, name: 'Threshold', minPct: 80, maxPct: 90, color: '#FB923C', description: 'Hard effort, lactate threshold training' },
    { zone: 5, name: 'Max Effort', minPct: 90, maxPct: 100, color: '#EF4444', description: 'Maximum intensity, sprint intervals' },
  ];
  return zones.map((z) => ({
    ...z,
    minBpm: Math.round((maxHr * z.minPct) / 100),
    maxBpm: Math.round((maxHr * z.maxPct) / 100),
  }));
}

function secToStr(sec: number): string {
  if (sec >= 99 * 60) return '>99:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function calcPaceZones(thresholdPaceSec: number): PaceZone[] {
  // thresholdPaceSec = pace at lactate threshold (sec/km), typically 10K race pace
  const zones = [
    { zone: 1, name: 'Easy', minPct: 130, maxPct: 160, color: '#4ADE80', description: 'Conversational, recovery runs' },
    { zone: 2, name: 'Aerobic', minPct: 120, maxPct: 130, color: '#86EFAC', description: 'Comfortable, long runs' },
    { zone: 3, name: 'Tempo', minPct: 108, maxPct: 120, color: '#FDE047', description: 'Comfortably hard, tempo runs' },
    { zone: 4, name: 'Threshold', minPct: 100, maxPct: 108, color: '#FB923C', description: 'Race effort, lactate threshold' },
    { zone: 5, name: 'VO2max', minPct: 88, maxPct: 100, color: '#EF4444', description: 'Hard intervals, 5K pace' },
  ];
  return zones.map((z) => ({
    ...z,
    // Higher % = slower (more seconds per km)
    maxPaceSec: Math.round((thresholdPaceSec * z.minPct) / 100),
    minPaceSec: Math.round((thresholdPaceSec * z.maxPct) / 100),
    minPaceStr: secToStr(Math.round((thresholdPaceSec * z.minPct) / 100)),
    maxPaceStr: secToStr(Math.round((thresholdPaceSec * z.maxPct) / 100)),
  }));
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const [userRow] = await db.select().from(users).where(eq(users.authEmail, userId)).limit(1);
    const sportProfiles = await db
      .select()
      .from(userSportProfiles)
      .where(eq(userSportProfiles.userId, userId));

    const ftpWatts = userRow?.ftpWatts ?? null;
    const maxHr = userRow?.maxHr ?? null;
    const pacePerKm = userRow?.pacePerKm ?? null;

    // Try to pull from sport profiles if not set at user level
    const cyclingProfile = sportProfiles.find((p) => p.sport === 'cycling');
    const runningProfile = sportProfiles.find((p) => p.sport === 'running');

    const effectiveFtp = ftpWatts ?? cyclingProfile?.ftpWatts ?? null;
    const effectiveMaxHr = maxHr ?? cyclingProfile?.maxHr ?? runningProfile?.maxHr ?? null;
    const effectivePaceSec = pacePerKm ?? runningProfile?.pacePerKmSec ?? null;

    return NextResponse.json({
      ftp: effectiveFtp,
      maxHr: effectiveMaxHr,
      thresholdPaceSec: effectivePaceSec,
      powerZones: effectiveFtp ? calcPowerZones(effectiveFtp) : null,
      hrZones: effectiveMaxHr ? calcHRZones(effectiveMaxHr) : null,
      paceZones: effectivePaceSec ? calcPaceZones(effectivePaceSec) : null,
    });
  } catch (err) {
    console.error('GET /api/training/zones error:', err);
    return serverError();
  }
}
