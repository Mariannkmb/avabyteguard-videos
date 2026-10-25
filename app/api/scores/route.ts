// ByteGuard-Man leaderboard (storage key keeps its original name so saved scores are kept).
// Works with any Upstash Redis database (free tier is enough). On Vercel, add one from
// Storage → Marketplace → Upstash Redis; it sets KV_REST_API_URL and KV_REST_API_TOKEN for you.
// Without those variables this route answers 503 and the game keeps scores on each player's device.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KEY = "bytemuncher:scores";
const KEEP = 100; // stored entries
const SHOW = 10; // returned entries
const LEVELS = 5;
const MAX_PER_LEVEL = 9000; // generous ceiling to reject obviously fake scores

type Row = { name: string; score: number; level: number };

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(cmds: (string | number)[][]) {
  const cfg = config();
  if (!cfg) throw new Error("not configured");
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return (await res.json()) as { result?: unknown; error?: string }[];
}

async function top(): Promise<Row[]> {
  const [r] = await redis([["ZREVRANGE", KEY, 0, SHOW - 1, "WITHSCORES"]]);
  const flat = (r.result as string[]) || [];
  const rows: Row[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    try {
      const m = JSON.parse(flat[i]) as { n: string; l: number };
      rows.push({ name: m.n, level: m.l, score: Number(flat[i + 1]) });
    } catch {}
  }
  return rows;
}

function cleanName(v: unknown) {
  if (typeof v !== "string") return null;
  const name = v
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 14);
  return /^[\p{L}\p{N} ._'-]{1,14}$/u.test(name) ? name : null;
}

export async function GET() {
  if (!config()) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    return NextResponse.json({ scores: await top() });
  } catch {
    return NextResponse.json({ error: "Leaderboard unavailable" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!config()) return NextResponse.json({ configured: false }, { status: 503 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = cleanName(body.name);
  const level = Number(body.level);
  const score = Number(body.score);
  if (!name) return NextResponse.json({ error: "Use 1–14 letters, numbers or spaces" }, { status: 400 });
  if (!Number.isInteger(level) || level < 1 || level > LEVELS)
    return NextResponse.json({ error: "Invalid level" }, { status: 400 });
  if (!Number.isInteger(score) || score <= 0 || score > level * MAX_PER_LEVEL)
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });

  try {
    const member = JSON.stringify({ n: name, l: level, t: Date.now() });
    await redis([
      ["ZADD", KEY, score, member],
      ["ZREMRANGEBYRANK", KEY, 0, -(KEEP + 1)],
    ]);
    return NextResponse.json({ scores: await top() });
  } catch {
    return NextResponse.json({ error: "Leaderboard unavailable" }, { status: 502 });
  }
}
