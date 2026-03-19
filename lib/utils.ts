import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || secondsPerKm <= 0) return '--:--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

export function formatPaceMin(secondsPerKm: number): string {
  if (!secondsPerKm || secondsPerKm <= 0) return '--:--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function getSportColor(sport: string): string {
  const colors: Record<string, string> = {
    cycling: '#7C3AED',
    running: '#00D4FF',
    triathlon: '#FFD700',
    swimming: '#4488FF',
    trail_running: '#00CC44',
    gravel: '#8B5CF6',
    duathlon: '#CC44FF',
    mtb: '#44FF88',
    gym: '#A78BFA',
    powerlifting: '#8B5CF6',
    crossfit: '#6D28D9',
    calisthenics: '#DDD6FE',
    olympic_weightlifting: '#FFD700',
    bodybuilding: '#7C3AED',
    hiit: '#FF0066',
    yoga: '#AA44FF',
    boxing: '#F59E0B',
    martial_arts: '#EF4444',
  };
  return colors[sport] ?? '#888888';
}

const sportLabels: Record<string, Record<string, string>> = {
  pl: {
    cycling: 'Kolarstwo',
    running: 'Bieganie',
    triathlon: 'Triathlon',
    swimming: 'Pływanie',
    trail_running: 'Trail Running',
    gravel: 'Gravel',
    duathlon: 'Duathlon',
    mtb: 'MTB',
    gym: 'Siłownia',
    powerlifting: 'Powerlifting',
    crossfit: 'CrossFit',
    calisthenics: 'Kalistenika',
    olympic_weightlifting: 'Olimp. Lifting',
    bodybuilding: 'Kulturystyka',
    hiit: 'HIIT',
    yoga: 'Yoga',
    boxing: 'Boks',
    martial_arts: 'Sztuki walki',
  },
  en: {
    cycling: 'Cycling',
    running: 'Running',
    triathlon: 'Triathlon',
    swimming: 'Swimming',
    trail_running: 'Trail Running',
    gravel: 'Gravel',
    duathlon: 'Duathlon',
    mtb: 'MTB',
    gym: 'Gym',
    powerlifting: 'Powerlifting',
    crossfit: 'CrossFit',
    calisthenics: 'Calisthenics',
    olympic_weightlifting: 'Olympic Lifting',
    bodybuilding: 'Bodybuilding',
    hiit: 'HIIT',
    yoga: 'Yoga',
    boxing: 'Boxing',
    martial_arts: 'Martial Arts',
  },
};

export function getSportLabel(sport: string, lang: string = 'pl'): string {
  const labels = sportLabels[lang] ?? sportLabels.pl;
  return labels[sport] ?? sport;
}

export function getMatchScoreColor(score: number): string {
  if (score >= 70) return '#00CC44';
  if (score >= 40) return '#FFD700';
  return '#7C3AED';
}

export function getMatchScoreClass(score: number): string {
  if (score >= 70) return 'match-score-high';
  if (score >= 40) return 'match-score-medium';
  return 'match-score-low';
}

export function formatRelativeTime(date: Date | string, lang: string = 'pl'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (lang === 'pl') {
    if (seconds < 60) return 'przed chwilą';
    if (minutes < 60) return `${minutes} min temu`;
    if (hours < 24) return `${hours} godz. temu`;
    if (days < 7) return `${days} dn. temu`;
    return d.toLocaleDateString('pl-PL');
  }

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US');
}

export const SPORTS = [
  // Core 3 — always first
  { value: 'cycling',      label: 'Kolarstwo' },
  { value: 'running',      label: 'Bieganie' },
  { value: 'gym',          label: 'Siłownia' },
  // Endurance
  { value: 'trail_running', label: 'Trail Running' },
  { value: 'gravel',       label: 'Gravel' },
  { value: 'mtb',          label: 'MTB' },
  { value: 'triathlon',    label: 'Triathlon' },
  { value: 'swimming',     label: 'Pływanie' },
  { value: 'duathlon',     label: 'Duathlon' },
  // Strength
  { value: 'powerlifting', label: 'Powerlifting' },
  { value: 'crossfit',     label: 'CrossFit' },
  { value: 'calisthenics', label: 'Kalistenika' },
  { value: 'olympic_weightlifting', label: 'Olimp. Lifting' },
  { value: 'bodybuilding', label: 'Kulturystyka' },
  { value: 'hiit',         label: 'HIIT' },
  { value: 'yoga',         label: 'Yoga' },
  { value: 'boxing',       label: 'Boks' },
  { value: 'martial_arts', label: 'Sztuki walki' },
] as const;

export type SportType = typeof SPORTS[number]['value'];

export const GYM_SPORTS = [
  'gym', 'powerlifting', 'crossfit', 'calisthenics',
  'olympic_weightlifting', 'bodybuilding', 'hiit', 'yoga', 'boxing', 'martial_arts',
];

export function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Pace conversions
export function paceSecToMinKm(sec: number): string {
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

export function paceSecToKmh(sec: number): number {
  return Math.round((3600 / sec) * 10) / 10;
}

export function kmhToPaceSec(kmh: number): number {
  return Math.round(3600 / kmh);
}

export function minKmToPaceSec(minStr: string): number {
  const parts = minStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1] ?? '0');
}

export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}
