import { cookies } from 'next/headers';

export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('tt_user_id')?.value ?? null;
}
