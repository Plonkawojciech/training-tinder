import { NextResponse } from 'next/server';

/**
 * Standardized API error codes.
 * Frontend should match on `code`, never on `message`.
 */
export const ErrorCode = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  INVALID_REGISTRATION_DATA: 'INVALID_REGISTRATION_DATA',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  INVALID_CURRENT_PASSWORD: 'INVALID_CURRENT_PASSWORD',

  // Generic
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Upload
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  NO_FILES_PROVIDED: 'NO_FILES_PROVIDED',
  TOO_MANY_FILES: 'TOO_MANY_FILES',

  // Validation
  INVALID_USERNAME: 'INVALID_USERNAME',
  INVALID_AGE: 'INVALID_AGE',
  INVALID_WEIGHT: 'INVALID_WEIGHT',
  INVALID_FTP: 'INVALID_FTP',
  INVALID_HEIGHT: 'INVALID_HEIGHT',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_TIME: 'INVALID_TIME',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  INVALID_RATING: 'INVALID_RATING',
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_ACTION: 'INVALID_ACTION',
  CONTENT_TOO_SHORT: 'CONTENT_TOO_SHORT',
  CONTENT_TOO_LONG: 'CONTENT_TOO_LONG',
  TITLE_TOO_SHORT: 'TITLE_TOO_SHORT',
  MISSING_FIELDS: 'MISSING_FIELDS',

  // Strava / Garmin
  STRAVA_NOT_CONFIGURED: 'STRAVA_NOT_CONFIGURED',
  STRAVA_CONNECTION_ERROR: 'STRAVA_CONNECTION_ERROR',
  STRAVA_TOKEN_EXPIRED: 'STRAVA_TOKEN_EXPIRED',
  GARMIN_CONNECTION_ERROR: 'GARMIN_CONNECTION_ERROR',
  GARMIN_CREDENTIALS_REQUIRED: 'GARMIN_CREDENTIALS_REQUIRED',

  // Session
  SESSION_FULL: 'SESSION_FULL',
  ALREADY_JOINED: 'ALREADY_JOINED',
  ALREADY_REVIEWED: 'ALREADY_REVIEWED',

  // Social
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
  SELF_ACTION: 'SELF_ACTION',
  ALREADY_SWIPED: 'ALREADY_SWIPED',
  ALREADY_LIKED: 'ALREADY_LIKED',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Create a standardized JSON error response.
 * Format: { error: { code: "CODE", message: "human-readable" } }
 */
export function apiError(
  code: ErrorCodeType,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

// Convenience shortcuts for most common errors
export const unauthorized = (message = 'Unauthorized') =>
  apiError(ErrorCode.UNAUTHORIZED, message, 401);

export const forbidden = (message = 'Forbidden') =>
  apiError(ErrorCode.FORBIDDEN, message, 403);

export const notFound = (message = 'Not found') =>
  apiError(ErrorCode.NOT_FOUND, message, 404);

export const serverError = (message = 'Internal server error') =>
  apiError(ErrorCode.INTERNAL_SERVER_ERROR, message, 500);

export const badRequest = (code: ErrorCodeType, message: string) =>
  apiError(code, message, 400);

export const rateLimited = (message = 'Too many requests') =>
  apiError(ErrorCode.RATE_LIMITED, message, 429);
