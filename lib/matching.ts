import { haversineDistance } from './utils';

export interface UserForMatching {
  id: string;
  clerkId: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  sportTypes: string[];
  pacePerKm: number | null;
  weeklyKm: number | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
}

export interface MatchResult {
  user: UserForMatching;
  score: number;
  breakdown: {
    sportMatch: number;
    paceMatch: number;
    locationMatch: number;
    weeklyKmMatch: number;
  };
  distanceKm: number | null;
}

export function calculateMatchScore(
  currentUser: UserForMatching,
  candidate: UserForMatching
): MatchResult {
  let score = 0;
  const breakdown = {
    sportMatch: 0,
    paceMatch: 0,
    locationMatch: 0,
    weeklyKmMatch: 0,
  };

  // Sport match (40 points)
  const sharedSports = currentUser.sportTypes.filter((s) =>
    candidate.sportTypes.includes(s)
  );
  if (sharedSports.length > 0) {
    const sportScore = Math.min(40, sharedSports.length * 20);
    score += sportScore;
    breakdown.sportMatch = sportScore;
  }

  // Pace match (30 points)
  if (currentUser.pacePerKm && candidate.pacePerKm) {
    const paceDiff = Math.abs(currentUser.pacePerKm - candidate.pacePerKm);
    if (paceDiff < 30) {
      score += 30;
      breakdown.paceMatch = 30;
    } else if (paceDiff < 60) {
      score += 20;
      breakdown.paceMatch = 20;
    } else if (paceDiff < 120) {
      score += 10;
      breakdown.paceMatch = 10;
    }
  }

  // Location match (20 points)
  let distanceKm: number | null = null;
  if (
    currentUser.lat !== null &&
    currentUser.lon !== null &&
    candidate.lat !== null &&
    candidate.lon !== null
  ) {
    distanceKm = haversineDistance(
      currentUser.lat,
      currentUser.lon,
      candidate.lat,
      candidate.lon
    );
    if (distanceKm < 2) {
      score += 20;
      breakdown.locationMatch = 20;
    } else if (distanceKm < 5) {
      score += 15;
      breakdown.locationMatch = 15;
    } else if (distanceKm < 10) {
      score += 10;
      breakdown.locationMatch = 10;
    } else if (distanceKm < 25) {
      score += 5;
      breakdown.locationMatch = 5;
    }
  }

  // Weekly km match (10 points)
  if (currentUser.weeklyKm && candidate.weeklyKm) {
    const weeklyDiff = Math.abs(currentUser.weeklyKm - candidate.weeklyKm);
    if (weeklyDiff < 20) {
      score += 10;
      breakdown.weeklyKmMatch = 10;
    } else if (weeklyDiff < 50) {
      score += 5;
      breakdown.weeklyKmMatch = 5;
    }
  }

  return {
    user: candidate,
    score: Math.min(100, score),
    breakdown,
    distanceKm,
  };
}

export function rankMatches(
  currentUser: UserForMatching,
  candidates: UserForMatching[]
): MatchResult[] {
  return candidates
    .filter((c) => c.clerkId !== currentUser.clerkId)
    .map((candidate) => calculateMatchScore(currentUser, candidate))
    .sort((a, b) => b.score - a.score);
}

export function filterByLocation(
  matches: MatchResult[],
  maxDistanceKm: number
): MatchResult[] {
  return matches.filter(
    (m) => m.distanceKm === null || m.distanceKm <= maxDistanceKm
  );
}

export function filterBySport(
  matches: MatchResult[],
  sport: string
): MatchResult[] {
  if (!sport || sport === 'all') return matches;
  return matches.filter((m) => m.user.sportTypes.includes(sport));
}
