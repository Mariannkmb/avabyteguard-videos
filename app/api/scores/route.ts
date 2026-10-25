// Leaderboards for the AvaByteGuard games (Patch-Man and Zone Guard).
// Works with any Upstash Redis database (free tier is enough). On Vercel, add one from
// Storage → Marketplace → Upstash Redis; it sets KV_REST_API_URL and KV_REST_API_TOKEN for you.
// Without those variables this route answers 503 and each game keeps scores on the player's device.
// GET/POST /api/scores                → Patch-Man
// GET/POST /api/scores?game=zoneguard → Zone Guard

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KEEP = 100; // stored entries per game
const SHOW = 5; // returned entries (top 5)

type Row = { name: string; score: number; level: number; time?: number };
type Game = {
  key: string; // Patch-Man keeps its original key so saved scores are kept
  validLevel: (l: number) => boolean;
  maxScore: (l: number) => number;
  needsTime: boolean;
};
const GAMES: Record<string, Game> = {
  patchman: {
    key: "bytemuncher:scores",
    validLevel: (l) => l >= 1 && l <= 5,
    maxScore: (l) => l * 9000,
    needsTime: false,
  },
  zoneguard: {
    key: "zoneguard:scores",
    validLevel: (l) => l >= 5 && l <= 9,
    maxScore: () => 2000,
    needsTime: true,
  },
};

function gameFrom(req: Request) {
  const g = new URL(req.url).searchParams.get("game") || "patchman";
  return GAMES[g] ?? null;
}

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

async function top(game: Game): Promise<Row[]> {
  const [r] = await redis([["ZREVRANGE", game.key, 0, SHOW - 1, "WITHSCORES"]]);
  const flat = (r.result as string[]) || [];
  const rows: Row[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    try {
      const m = JSON.parse(flat[i]) as { n: string; l: number; s?: number };
      const row: Row = { name: m.n, level: m.l, score: Number(flat[i + 1]) };
      if (m.s) row.time = m.s;
      rows.push(row);
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

export async function GET(req: Request) {
  const game = gameFrom(req);
  if (!game) return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  if (!config()) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    return NextResponse.json({ scores: await top(game) });
  } catch {
    return NextResponse.json({ error: "Leaderboard unavailable" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const game = gameFrom(req);
  if (!game) return NextResponse.json({ error: "Unknown game" }, { status: 400 });
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
  const time = Number(body.time);
  if (!name) return NextResponse.json({ error: "Use 1–14 letters, numbers or spaces" }, { status: 400 });
  if (!Number.isInteger(level) || !game.validLevel(level))
    return NextResponse.json({ error: "Invalid level" }, { status: 400 });
  if (!Number.isInteger(score) || score <= 0 || score > game.maxScore(level))
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  if (game.needsTime && (!Number.isInteger(time) || time < 1 || time > 36000))
    return NextResponse.json({ error: "Invalid time" }, { status: 400 });

  try {
    const member = JSON.stringify(game.needsTime ? { n: name, l: level, s: time, t: Date.now() } : { n: name, l: level, t: Date.now() });
    await redis([
      ["ZADD", game.key, score, member],
      ["ZREMRANGEBYRANK", game.key, 0, -(KEEP + 1)],
    ]);
    return NextResponse.json({ scores: await top(game) });
  } catch {
    return NextResponse.json({ error: "Leaderboard unavailable" }, { status: 502 });
  }
}
