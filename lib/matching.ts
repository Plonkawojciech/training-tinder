import { haversineDistance } from './utils';

export interface UserForMatching {
  id: string;
  authEmail: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  sportTypes: string[];
  pacePerKm: number | null;
  weeklyKm: number | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  gymName?: string | null;
  strengthLevel?: string | null;
  trainingSplits?: string[] | null;
  goals?: string[] | null;
  availability?: string[] | null;
  stravaVerified?: boolean | null;
}

export interface MatchResult {
  user: UserForMatching;
  score: number;
  breakdown: {
    sportMatch: number;
    paceMatch: number;
    locationMatch: number;
    weeklyKmMatch: number;
    gymMatch: number;
    splitMatch: number;
    strengthMatch: number;
    goalMatch: number;
    profileCompletion: number;
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
    gymMatch: 0,
    splitMatch: 0,
    strengthMatch: 0,
    goalMatch: 0,
    profileCompletion: 0,
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

  // Gym match (+15 pts for same gym)
  if (
    currentUser.gymName &&
    candidate.gymName &&
    currentUser.gymName.toLowerCase().trim() === candidate.gymName.toLowerCase().trim()
  ) {
    score += 15;
    breakdown.gymMatch = 15;
  }

  // Same training split (+10 pts)
  if (
    currentUser.trainingSplits?.length &&
    candidate.trainingSplits?.length
  ) {
    const sharedSplits = currentUser.trainingSplits.filter((s) =>
      candidate.trainingSplits!.includes(s)
    );
    if (sharedSplits.length > 0) {
      score += 10;
      breakdown.splitMatch = 10;
    }
  }

  // Same strength level (+10 pts)
  if (
    currentUser.strengthLevel &&
    candidate.strengthLevel &&
    currentUser.strengthLevel === candidate.strengthLevel
  ) {
    score += 10;
    breakdown.strengthMatch = 10;
  }

  // Overlapping goals (+5 pts each, up to +20 pts)
  if (currentUser.goals?.length && candidate.goals?.length) {
    const sharedGoals = currentUser.goals.filter((g) =>
      candidate.goals!.includes(g)
    );
    const goalScore = Math.min(20, sharedGoals.length * 5);
    score += goalScore;
    breakdown.goalMatch = goalScore;
  }

  // Profile completion bonus (up to +20 pts)
  // username(+2), bio(+3), sportTypes filled(+3), pacePerKm(+2), weeklyKm(+2),
  // city(+2), avatarUrl(+2), goals(+2), availability(+2)
  let completionScore = 0;
  if (candidate.username) completionScore += 2;
  if (candidate.bio) completionScore += 3;
  if (candidate.sportTypes && candidate.sportTypes.length > 0) completionScore += 3;
  if (candidate.pacePerKm) completionScore += 2;
  if (candidate.weeklyKm) completionScore += 2;
  if (candidate.city) completionScore += 2;
  if (candidate.avatarUrl) completionScore += 2;
  if (candidate.goals && candidate.goals.length > 0) completionScore += 2;
  if (candidate.availability && candidate.availability.length > 0) completionScore += 2;
  completionScore = Math.min(20, completionScore);
  score += completionScore;
  breakdown.profileCompletion = completionScore;

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
    .filter((c) => c.authEmail !== currentUser.authEmail)
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
