import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/jwt';

export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}
