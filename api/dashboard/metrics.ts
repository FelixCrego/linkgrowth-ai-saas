import type { QueryResultRow } from "pg";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { sql } from "../_lib/db.js";
import { fetchLinkedInMemberAnalytics } from "../_lib/linkedin.js";

type LinkedInRow = {
  linkedin_member_urn: string;
  expires_at: string | null;
  access_token: string;
};

type CountRow = QueryResultRow & { count: number };
type DayCountRow = QueryResultRow & { day: string | Date; count: number };
type RecentRow = QueryResultRow & { id: string; created_at: string; prompt?: string; query?: string; type?: string };
type RegclassRow = QueryResultRow & { regclass: string | null };

function toDayKey(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatDayLabel(dayKey: string): string {
  return new Date(`${dayKey}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const workspaceId = session.workspaceId;

    const linkedInAccountRes = await sql<LinkedInRow>(
      "select linkedin_member_urn, expires_at, access_token from linkedin_accounts where workspace_id = $1 limit 1",
      [workspaceId]
    );
    const linkedInAccount = linkedInAccountRes.rows[0];
    const linkedInAnalytics = linkedInAccount
      ? await fetchLinkedInMemberAnalytics(linkedInAccount.access_token).catch((error: unknown) => ({
          followerCount: null,
          followerDeltaLast7Days: null,
          available: false,
          error: error instanceof Error ? error.message : "LinkedIn analytics unavailable",
        }))
      : { followerCount: null, followerDeltaLast7Days: null, available: false, error: null };

    const publishTableRes = await sql<RegclassRow>("select to_regclass('public.linkedin_post_events') as regclass");
    const hasPublishEventsTable = Boolean(publishTableRes.rows[0]?.regclass);

    const [draftCountRes, draft7Res, researchCountRes, research7Res, publishCountRes, publish7Res, draftDayRes, researchDayRes, publishDayRes] =
      await Promise.all([
        sql<CountRow>("select count(*)::int as count from generated_posts where workspace_id = $1", [workspaceId]),
        sql<CountRow>("select count(*)::int as count from generated_posts where workspace_id = $1 and created_at >= now() - interval '7 days'", [
          workspaceId,
        ]),
        sql<CountRow>("select count(*)::int as count from research_queries where workspace_id = $1", [workspaceId]),
        sql<CountRow>("select count(*)::int as count from research_queries where workspace_id = $1 and created_at >= now() - interval '7 days'", [
          workspaceId,
        ]),
        hasPublishEventsTable
          ? sql<CountRow>("select count(*)::int as count from linkedin_post_events where workspace_id = $1", [workspaceId])
          : Promise.resolve({ rows: [{ count: 0 }] } as { rows: CountRow[] }),
        hasPublishEventsTable
          ? sql<CountRow>("select count(*)::int as count from linkedin_post_events where workspace_id = $1 and created_at >= now() - interval '7 days'", [
              workspaceId,
            ])
          : Promise.resolve({ rows: [{ count: 0 }] } as { rows: CountRow[] }),
        sql<DayCountRow>(
          "select created_at::date as day, count(*)::int as count from generated_posts where workspace_id = $1 and created_at >= now() - interval '7 days' group by 1",
          [workspaceId]
        ),
        sql<DayCountRow>(
          "select created_at::date as day, count(*)::int as count from research_queries where workspace_id = $1 and created_at >= now() - interval '7 days' group by 1",
          [workspaceId]
        ),
        hasPublishEventsTable
          ? sql<DayCountRow>(
              "select created_at::date as day, count(*)::int as count from linkedin_post_events where workspace_id = $1 and created_at >= now() - interval '7 days' group by 1",
              [workspaceId]
            )
          : Promise.resolve({ rows: [] } as { rows: DayCountRow[] }),
      ]);

    const draftMap = new Map<string, number>(draftDayRes.rows.map((row) => [toDayKey(row.day), row.count]));
    const researchMap = new Map<string, number>(researchDayRes.rows.map((row) => [toDayKey(row.day), row.count]));
    const publishMap = new Map<string, number>(publishDayRes.rows.map((row) => [toDayKey(row.day), row.count]));

    const weeklyActivity: Array<{ name: string; activity: number }> = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      day.setUTCDate(day.getUTCDate() - offset);
      const dayKey = day.toISOString().slice(0, 10);
      const total = (draftMap.get(dayKey) ?? 0) + (researchMap.get(dayKey) ?? 0) + (publishMap.get(dayKey) ?? 0);
      weeklyActivity.push({ name: formatDayLabel(dayKey), activity: total });
    }

    const [draftRecent, researchRecent, publishRecent] = await Promise.all([
      sql<RecentRow>(
        "select id::text as id, created_at::text as created_at, left(prompt, 80) as prompt from generated_posts where workspace_id = $1 order by created_at desc limit 4",
        [workspaceId]
      ),
      sql<RecentRow>(
        "select id::text as id, created_at::text as created_at, left(query, 80) as query from research_queries where workspace_id = $1 order by created_at desc limit 4",
        [workspaceId]
      ),
      hasPublishEventsTable
        ? sql<RecentRow>(
            "select id::text as id, created_at::text as created_at, case when has_image then 'image' else 'text' end as type from linkedin_post_events where workspace_id = $1 order by created_at desc limit 4",
            [workspaceId]
          )
        : Promise.resolve({ rows: [] } as { rows: RecentRow[] }),
    ]);

    const recentActivity = [
      ...draftRecent.rows.map((row) => ({
        id: `draft-${row.id}`,
        label: "Draft generated",
        detail: row.prompt ?? "LinkedIn draft",
        createdAt: row.created_at,
      })),
      ...researchRecent.rows.map((row) => ({
        id: `research-${row.id}`,
        label: "Research run",
        detail: row.query ?? "Market research",
        createdAt: row.created_at,
      })),
      ...publishRecent.rows.map((row) => ({
        id: `publish-${row.id}`,
        label: "Posted to LinkedIn",
        detail: row.type === "image" ? "Image post" : "Text post",
        createdAt: row.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);

    sendJson(res, 200, {
      linkedin: {
        connected: Boolean(linkedInAccount),
        memberUrn: linkedInAccount?.linkedin_member_urn ?? null,
        expiresAt: linkedInAccount?.expires_at ?? null,
        analytics: linkedInAnalytics,
      },
      stats: {
        draftsTotal: draftCountRes.rows[0]?.count ?? 0,
        draftsLast7Days: draft7Res.rows[0]?.count ?? 0,
        researchTotal: researchCountRes.rows[0]?.count ?? 0,
        researchLast7Days: research7Res.rows[0]?.count ?? 0,
        postsTotal: publishCountRes.rows[0]?.count ?? 0,
        postsLast7Days: publish7Res.rows[0]?.count ?? 0,
      },
      weeklyActivity,
      recentActivity,
    });
  } catch (error) {
    serverError(res, error);
  }
}
