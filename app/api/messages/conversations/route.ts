import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { unauthorized, serverError } from '@/lib/api-errors';

/**
 * GET /api/messages/conversations
 *
 * Returns the last message for each conversation partner in a single query,
 * replacing the N+1 pattern of fetching per-partner messages individually.
 *
 * Response: Array of { partnerId, content, createdAt }
 */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    // Use a lateral join / subquery approach:
    // 1. Find all distinct conversation partners
    // 2. For each partner, get the latest message
    //
    // We use a CTE (Common Table Expression) to get all messages involving this user,
    // then group by partner and pick the latest one.
    const result = await db.execute(sql`
      WITH partner_messages AS (
        SELECT
          CASE
            WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId}
            ELSE ${messages.senderId}
          END AS partner_id,
          ${messages.content} AS content,
          ${messages.createdAt} AS created_at,
          ROW_NUMBER() OVER (
            PARTITION BY CASE
              WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId}
              ELSE ${messages.senderId}
            END
            ORDER BY ${messages.createdAt} DESC
          ) AS rn
        FROM ${messages}
        WHERE ${messages.senderId} = ${userId}
           OR ${messages.receiverId} = ${userId}
      )
      SELECT partner_id, content, created_at
      FROM partner_messages
      WHERE rn = 1
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const conversations = result.rows.map((row: Record<string, unknown>) => ({
      partnerId: row.partner_id as string,
      content: row.content as string,
      createdAt: row.created_at as string,
    }));

    return NextResponse.json(conversations);
  } catch (err) {
    console.error('GET /api/messages/conversations error:', err);
    return serverError();
  }
}
