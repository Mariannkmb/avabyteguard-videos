"use client";

import { useEffect, useRef, useState } from "react";
import { Ava, C, Leaderboard, NameEntry, body, display, mono, useLeaderboard, type Board, type Row } from "./ByteMuncher";

/* ================= puzzle generator ================= */
// N x N grid split into N network zones. Place one IDS sensor per row, column and zone;
// sensors never touch, not even diagonally. Every generated puzzle has exactly one solution.
type Puzzle = { n: number; zones: number[][]; solution: number[] }; // solution[row] = column

const NB = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomPlacement(n: number): number[] | null {
  const cols: number[] = [];
  const used = new Set<number>();
  const go = (r: number): boolean => {
    if (r === n) return true;
    for (const c of shuffle([...Array(n).keys()])) {
      if (used.has(c) || (r > 0 && Math.abs(cols[r - 1] - c) <= 1)) continue;
      cols[r] = c;
      used.add(c);
      if (go(r + 1)) return true;
      used.delete(c);
    }
    return false;
  };
  return go(0) ? cols : null;
}

function solve(n: number, zones: number[][], limit: number, out: number[][]) {
  const cols: number[] = [];
  const usedC = new Array(n).fill(false);
  const usedZ = new Array(n).fill(false);
  let count = 0;
  const go = (r: number) => {
    if (count >= limit) return;
    if (r === n) {
      count++;
      out.push([...cols]);
      return;
    }
    for (let c = 0; c < n && count < limit; c++) {
      const z = zones[r][c];
      if (usedC[c] || usedZ[z] || (r > 0 && Math.abs(cols[r - 1] - c) <= 1)) continue;
      cols[r] = c;
      usedC[c] = usedZ[z] = true;
      go(r + 1);
      usedC[c] = usedZ[z] = false;
    }
  };
  go(0);
  return count;
}

function stillConnected(zones: number[][], n: number, z: number, skipR: number, skipC: number) {
  const cells: [number, number][] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (zones[r][c] === z && !(r === skipR && c === skipC)) cells.push([r, c]);
  if (!cells.length) return false;
  const seen = new Set([cells[0].join()]);
  const q = [cells[0]];
  while (q.length) {
    const [r, c] = q.pop() as [number, number];
    for (const [dr, dc] of NB) {
      const nr = r + dr,
        nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= n || nc >= n || (nr === skipR && nc === skipC)) continue;
      if (zones[nr][nc] !== z || seen.has(`${nr},${nc}`)) continue;
      seen.add(`${nr},${nc}`);
      q.push([nr, nc]);
    }
  }
  return seen.size === cells.length;
}

function attempt(n: number): Puzzle | null {
  const sol = randomPlacement(n);
  if (!sol) return null;
  const zones: number[][] = Array.from({ length: n }, () => new Array(n).fill(-1));
  sol.forEach((c, r) => (zones[r][c] = r));
  for (let left = n * n - n; left > 0; left--) {
    const frontier: [number, number, number][] = [];
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (zones[r][c] !== -1) continue;
        for (const [dr, dc] of NB) {
          const nr = r + dr,
            nc = c + dc;
          if (nr >= 0 && nc >= 0 && nr < n && nc < n && zones[nr][nc] !== -1) frontier.push([r, c, zones[nr][nc]]);
        }
      }
    const [r, c, z] = frontier[Math.floor(Math.random() * frontier.length)];
    zones[r][c] = z;
  }
  // while a second solution exists, hand one of its cells to a neighbouring zone
  for (let iter = 0; iter < 200; iter++) {
    const sols: number[][] = [];
    if (solve(n, zones, 2, sols) === 1) return { n, zones, solution: sol };
    const alt = sols.find((s) => s.some((c, r) => c !== sol[r]));
    if (!alt) return null;
    let moved = false;
    for (const [r, c] of shuffle(alt.map((c, r) => [r, c] as [number, number]).filter(([r, c]) => sol[r] !== c))) {
      const z = zones[r][c];
      const opts = shuffle(
        NB.map(([dr, dc]) => [r + dr, c + dc]).filter(
          ([nr, nc]) => nr >= 0 && nc >= 0 && nr < n && nc < n && zones[nr][nc] !== z
        )
      );
      if (!opts.length || !stillConnected(zones, n, z, r, c)) continue;
      zones[r][c] = zones[opts[0][0]][opts[0][1]];
      moved = true;
      break;
    }
    if (!moved) return null;
  }
  return null;
}

function generate(n: number): Puzzle {
  for (let i = 0; i < 3000; i++) {
    const p = attempt(n);
    if (p) return p;
  }
  throw new Error("Could not build a puzzle");
}

/* ================= look ================= */
const ZONE_COLORS = ["#3B7EA1", "#7B5BC4", "#C2577A", "#3F9068", "#C08A3E", "#5468C4", "#2F9A93", "#A65AA8", "#7C8C3C"];
const SIZES = [
  { n: 5, label: "Easy" },
  { n: 6, label: "Medium" },
  { n: 7, label: "Hard" },
  { n: 8, label: "Expert" },
  { n: 9, label: "Master" },
];
const HINTS = 3;
// points = size bonus, doubled when you finish instantly and fading to nothing at par time; each hint costs 25%
const BASE: Record<number, number> = { 5: 100, 6: 200, 7: 400, 8: 700, 9: 1000 };
const PAR: Record<number, number> = { 5: 60, 6: 120, 7: 240, 8: 420, 9: 600 }; // seconds
const pointsFor = (n: number, secs: number, hintsUsed: number) =>
  Math.max(10, Math.round(BASE[n] * (1 + Math.max(0, (PAR[n] - secs) / PAR[n])) * (1 - 0.25 * hintsUsed)));
const EMPTY = 0,
  CROSS = 1,
  SENSOR = 2;

function SensorIcon({ className = "", spin = true }: { className?: string; spin?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="rgba(6,9,18,.55)" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5.2" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1" />
      <g className={spin ? "zg-spin" : ""} style={{ transformOrigin: "12px 12px" }}>
        <path d="M12 12 L12 2.5 A9.5 9.5 0 0 1 20.2 7.2 Z" fill="rgba(127,231,240,.45)" />
      </g>
      <circle cx="12" cy="12" r="2.1" fill={C.red} />
      <circle cx="16.3" cy="7.6" r="1.1" fill={C.byte} />
    </svg>
  );
}
function CrossIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M7 7 L17 17 M17 7 L7 17" stroke="rgba(255,255,255,.72)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// small 3x3 diagrams for the rules strip
function RuleIcon({ kind }: { kind: "zone" | "line" | "touch" }) {
  const cells = [...Array(9).keys()];
  const fill = (i: number) => {
    const r = Math.floor(i / 3),
      c = i % 3;
    if (kind === "zone") return i === 4 || i === 1 || i === 3 ? ZONE_COLORS[0] : "#1F2746";
    if (kind === "line") return r === 1 || c === 1 ? ZONE_COLORS[1] : "#1F2746";
    return ZONE_COLORS[2];
  };
  const mark = (i: number) => {
    if (i === 4) return "sensor";
    if (kind === "touch") return "x";
    if (kind === "line" && (i === 1 || i === 3 || i === 5 || i === 7)) return "x";
    if (kind === "zone" && (i === 1 || i === 3)) return "x";
    return "";
  };
  return (
    <div className="grid h-11 w-11 shrink-0 grid-cols-3 gap-[2px]">
      {cells.map((i) => (
        <div key={i} className="flex items-center justify-center rounded-[3px]" style={{ background: fill(i) }}>
          {mark(i) === "sensor" && <SensorIcon className="h-3 w-3" spin={false} />}
          {mark(i) === "x" && <CrossIcon className="h-2.5 w-2.5" />}
        </div>
      ))}
    </div>
  );
}

// event-time helpers (kept outside components so they never run during render)
const clock = () => Date.now();
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const readBest = (n: number) => {
  try {
    return Number(localStorage.getItem(`zg-best-${n}`)) || 0;
  } catch {
    return 0;
  }
};

/* ================= game window ================= */
function ZoneGuardModal({
  onClose,
  board,
  submit,
}: {
  onClose: () => void;
  board: Board;
  submit: (r: Row) => Promise<number>;
}) {
  const [n, setN] = useState(() => {
    try {
      const v = Number(localStorage.getItem("zg-size"));
      return v >= 5 && v <= 9 ? v : 6;
    } catch {
      return 6;
    }
  });
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generate(n));
  const [marks, setMarksState] = useState<number[][]>(() => Array.from({ length: n }, () => new Array(n).fill(EMPTY)));
  const marksRef = useRef(marks);
  const [hinted, setHinted] = useState<Set<string>>(() => new Set());
  const [hintsLeft, setHintsLeft] = useState(HINTS);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [best, setBest] = useState(() => readBest(n));
  const [newBest, setNewBest] = useState(false);
  const [points, setPoints] = useState(0);
  const [me, setMe] = useState<string | undefined>();
  const save = async (r: Row) => {
    setMe(r.name);
    return submit(r);
  };
  const drag = useRef(false);

  useEffect(() => {
    if (startAt === null || doneAt !== null) return;
    const t = setInterval(() => setNow(clock()), 250);
    return () => clearInterval(t);
  }, [startAt, doneAt]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const won = doneAt !== null;
  const sensors = marks.flat().filter((m) => m === SENSOR).length;
  const wrongFull = sensors === puzzle.n && !won;

  function commit(next: number[][], hintsUsed = HINTS - hintsLeft) {
    marksRef.current = next;
    setMarksState(next);
    const t = clock();
    if (startAt === null) {
      setStartAt(t);
      setNow(t);
    }
    const solved = puzzle.solution.every((c, r) => next[r][c] === SENSOR) && next.flat().filter((m) => m === SENSOR).length === puzzle.n;
    if (solved) {
      const start = startAt ?? t;
      const time = t - start;
      setPoints(pointsFor(puzzle.n, Math.round(time / 1000), hintsUsed));
      setDoneAt(t);
      setNow(t);
      const prev = readBest(puzzle.n);
      if (!prev || time < prev) {
        try {
          localStorage.setItem(`zg-best-${puzzle.n}`, String(time));
        } catch {}
        setBest(time);
        setNewBest(true);
      }
    }
  }

  function newPuzzle(size = n) {
    const p = generate(size);
    const empty = Array.from({ length: size }, () => new Array(size).fill(EMPTY));
    setN(size);
    try {
      localStorage.setItem("zg-size", String(size));
    } catch {}
    setPuzzle(p);
    marksRef.current = empty;
    setMarksState(empty);
    setHinted(new Set());
    setHintsLeft(HINTS);
    setStartAt(null);
    setDoneAt(null);
    setBest(readBest(size));
    setNewBest(false);
    setPoints(0);
  }

  function press(r: number, c: number) {
    if (won || hinted.has(`${r},${c}`)) return;
    const next = marksRef.current.map((row) => [...row]);
    next[r][c] = (next[r][c] + 1) % 3; // empty → ✕ → sensor → empty
    drag.current = next[r][c] === CROSS;
    commit(next);
  }
  function dragOver(x: number, y: number) {
    if (!drag.current || won) return;
    const el = document.elementFromPoint(x, y)?.closest("[data-cell]") as HTMLElement | null;
    if (!el) return;
    const r = Number(el.dataset.r),
      c = Number(el.dataset.c);
    if (marksRef.current[r]?.[c] !== EMPTY) return;
    const next = marksRef.current.map((row) => [...row]);
    next[r][c] = CROSS;
    commit(next);
  }

  function hint() {
    if (won || hintsLeft <= 0) return;
    const rows = puzzle.solution.map((c, r) => r).filter((r) => marksRef.current[r][puzzle.solution[r]] !== SENSOR);
    if (!rows.length) return;
    const r = pick(rows);
    const c = puzzle.solution[r];
    const z = puzzle.zones[r][c];
    const next = marksRef.current.map((row) => [...row]);
    // remove sensors that clash with the revealed one
    for (let rr = 0; rr < puzzle.n; rr++)
      for (let cc = 0; cc < puzzle.n; cc++) {
        if (next[rr][cc] !== SENSOR || (rr === r && cc === c)) continue;
        const clash = rr === r || cc === c || puzzle.zones[rr][cc] === z || (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1);
        if (clash) next[rr][cc] = EMPTY;
      }
    next[r][c] = SENSOR;
    setHinted((h) => new Set(h).add(`${r},${c}`));
    setHintsLeft((h) => h - 1);
    commit(next, HINTS - hintsLeft + 1);
  }

  function clearBoard() {
    if (won) return;
    const next = marksRef.current.map((row, r) => row.map((m, c) => (hinted.has(`${r},${c}`) ? m : EMPTY)));
    marksRef.current = next;
    setMarksState(next);
  }

  const elapsed = startAt === null ? 0 : (doneAt ?? now) - startAt;
  const z = puzzle.zones;
  const edge = (a: number | undefined, b: number) => (a === undefined || a !== b ? `3px solid ${C.ink}` : "1px solid rgba(6,9,18,.35)");

  return (
    <div
      className={`${body.className} fixed inset-0 z-50 overflow-y-auto`}
      style={{
        color: C.fg,
        background: `radial-gradient(1100px 560px at 50% -10%, rgba(127,231,240,.10), transparent 60%), ${C.ink}`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Zone Guard"
    >
      <style>{`@keyframes zgSpin{to{transform:rotate(360deg)}}.zg-spin{animation:zgSpin 3s linear infinite}@media (prefers-reduced-motion:reduce){.zg-spin{animation:none}}`}</style>
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 sm:py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em]" style={{ color: C.muted }}>
              Logic puzzle · {puzzle.n}×{puzzle.n}
            </div>
            <h2 className={`${display.className} text-4xl leading-none font-bold sm:text-5xl`}>
              <span className="whitespace-nowrap">
                Zone<span style={{ color: C.byte, textShadow: "0 0 18px rgba(127,231,240,.45)" }}>Guard</span>
              </span>
            </h2>
            <div className="mt-1 text-[13px] tracking-wide" style={{ color: C.muted }}>
              by AvaByteGuard
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["Time", fmt(elapsed)],
              ["Best", best ? fmt(best) : "–"],
              ["Sensors", `${sensors}/${puzzle.n}`],
            ].map(([label, value]) => (
              <div key={label} className="flex min-w-[72px] flex-col rounded-md px-3 py-1.5" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
                <small className="text-[11px] uppercase tracking-[0.14em]" style={{ color: C.muted }}>
                  {label}
                </small>
                <b className={`${mono.className} text-xl font-bold tabular-nums leading-tight`}>{value}</b>
              </div>
            ))}
            <button
              onClick={onClose}
              className="ml-1 self-stretch rounded-md px-4 font-semibold hover:brightness-125"
              style={{ background: "#1A2140", boxShadow: "inset 0 0 0 1px #2A3354" }}
            >
              ✕ Close
            </button>
          </div>
        </header>

        {/* rules */}
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["zone", "1 sensor per network zone"],
              ["line", "1 sensor per row and column"],
              ["touch", "Sensors can't touch, not even diagonally"],
            ] as const
          ).map(([k, text]) => (
            <div key={k} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
              <RuleIcon kind={k} />
              <span className="text-[14px] leading-snug">{text}</span>
            </div>
          ))}
        </div>

        {/* board */}
        <section
          className="flex flex-col items-center gap-3 rounded-2xl p-3 sm:p-4"
          style={{ background: C.panel, border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(127,231,240,.2)" }}
        >
          <div className="relative" style={{ width: "min(100%, 560px, 62vh)" }}>
            <div
              className="grid aspect-square w-full touch-none select-none overflow-hidden rounded-lg"
              style={{ gridTemplateColumns: `repeat(${puzzle.n}, minmax(0, 1fr))`, border: `3px solid ${C.ink}` }}
              onPointerMove={(e) => dragOver(e.clientX, e.clientY)}
              onPointerUp={() => (drag.current = false)}
              onPointerCancel={() => (drag.current = false)}
              onPointerLeave={() => (drag.current = false)}
            >
              {z.map((row, r) =>
                row.map((zone, c) => {
                  const m = marks[r][c];
                  const isHint = hinted.has(`${r},${c}`);
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      data-cell=""
                      data-r={r}
                      data-c={c}
                      aria-label={`Row ${r + 1}, column ${c + 1}${m === SENSOR ? ", sensor" : m === CROSS ? ", marked empty" : ""}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        try {
                          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                        } catch {}
                        press(r, c);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          press(r, c);
                        }
                      }}
                      className="relative flex items-center justify-center outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white"
                      style={{
                        background: ZONE_COLORS[zone % ZONE_COLORS.length],
                        borderTop: edge(z[r - 1]?.[c], zone),
                        borderBottom: edge(z[r + 1]?.[c], zone),
                        borderLeft: edge(row[c - 1], zone),
                        borderRight: edge(row[c + 1], zone),
                        filter: won && m !== SENSOR ? "saturate(.6) brightness(.8)" : "none",
                      }}
                    >
                      {m === SENSOR && <SensorIcon className="h-[72%] w-[72%] drop-shadow-[0_0_6px_rgba(127,231,240,.6)]" />}
                      {m === CROSS && <CrossIcon className="h-[46%] w-[46%]" />}
                      {isHint && (
                        <span className="absolute inset-[8%] rounded-full" style={{ boxShadow: `0 0 0 2px ${C.gold}` }} aria-hidden="true" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {won && (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg p-4 text-center"
                style={{ background: "rgba(6,9,18,.86)" }}
              >
                <Ava className="h-auto w-16 sm:w-28" />
                <h3 className={`${display.className} text-2xl sm:text-3xl`} style={{ color: C.byte, textShadow: "0 0 16px rgba(127,231,240,.5)" }}>
                  Network secured!
                </h3>
                <p className={`${mono.className} text-2xl font-bold tabular-nums`} style={{ color: C.gold }}>
                  +{points.toLocaleString("en-US")} pts
                </p>
                <p className="text-[14px]" style={{ color: C.muted }}>
                  All {puzzle.n} zones are monitored in{" "}
                  <b className={`${mono.className} tabular-nums`} style={{ color: C.fg }}>
                    {fmt(elapsed)}
                  </b>
                  {newBest ? " · new best time!" : ""}
                  {hintsLeft < HINTS ? ` · ${HINTS - hintsLeft} hint${HINTS - hintsLeft > 1 ? "s" : ""} used` : ""}
                </p>
                <NameEntry key={doneAt ?? 0} score={points} level={puzzle.n} time={Math.max(1, Math.round(elapsed / 1000))} submit={save} />
                <div className="mt-1 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => newPuzzle()}
                    className="rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider text-white"
                    style={{ background: C.red }}
                  >
                    New puzzle
                  </button>
                  {puzzle.n < 9 && (
                    <button
                      onClick={() => newPuzzle(puzzle.n + 1)}
                      className="rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider"
                      style={{ boxShadow: "inset 0 0 0 1px #2A3354" }}
                    >
                      Try {puzzle.n + 1}×{puzzle.n + 1}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="min-h-[1.5em] text-center text-[13px]" style={{ color: wrongFull ? C.gold : C.muted }} aria-live="polite">
            {wrongFull
              ? "Not quite: two sensors share a row, column or zone, or they touch. Keep trying!"
              : "Tap once for ✕ (no sensor here), twice for a sensor. Drag to mark many ✕ at once."}
          </p>

          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Board size">
              {SIZES.map((s) => (
                <button
                  key={s.n}
                  onClick={() => newPuzzle(s.n)}
                  aria-pressed={puzzle.n === s.n}
                  className="flex flex-col items-center rounded-md px-2.5 py-1 leading-tight"
                  style={{
                    background: puzzle.n === s.n ? C.byte : "transparent",
                    color: puzzle.n === s.n ? "#0B1226" : C.fg,
                    boxShadow: puzzle.n === s.n ? "none" : "inset 0 0 0 1px #2A3354",
                  }}
                >
                  <b className={`${mono.className} text-[13px]`}>
                    {s.n}×{s.n}
                  </b>
                  <span className="text-[10px] uppercase tracking-wider">{s.label}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={hint}
                disabled={won || hintsLeft === 0}
                className="rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider disabled:opacity-40"
                style={{ boxShadow: `inset 0 0 0 1px ${C.gold}88`, color: C.gold }}
              >
                Hint ({hintsLeft})
              </button>
              <button
                onClick={clearBoard}
                disabled={won}
                className="rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider disabled:opacity-40"
                style={{ boxShadow: "inset 0 0 0 1px #2A3354" }}
              >
                Clear
              </button>
              <button
                onClick={() => newPuzzle()}
                className="rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white"
                style={{ background: C.red }}
              >
                New puzzle
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 rounded-2xl p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
          <Leaderboard board={board} highlight={me} game="zoneguard" />
          <div className="flex flex-col gap-2 text-[13px]" style={{ color: C.muted }}>
            <h3 className={`${display.className} text-sm tracking-widest`}>HOW POINTS WORK</h3>
            <p>
              Bigger boards are worth more: {SIZES.map((s) => `${s.n}×${s.n} ${BASE[s.n]}`).join(" · ")}.
            </p>
            <p>Solve fast to earn up to double. The bonus fades out at par time ({SIZES.map((s) => `${Math.round(PAR[s.n] / 60)} min`).join(", ")}).</p>
            <p>Each hint you use costs 25% of the points.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= card on the home page ================= */
const SAMPLE = [
  [0, 0, 1, 1, 1],
  [0, 2, 2, 1, 3],
  [0, 2, 4, 3, 3],
  [2, 2, 4, 4, 3],
  [2, 4, 4, 3, 3],
];
const SAMPLE_MARKS: Record<string, number> = { "0,0": SENSOR, "0,1": CROSS, "1,0": CROSS, "1,1": CROSS, "2,3": SENSOR, "1,2": CROSS };

export default function ZoneGuard() {
  const [open, setOpen] = useState(false);
  const { board, submit } = useLeaderboard("zoneguard");
  const leader = board.rows[0];

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <section className="bg-black px-8 pb-16 text-white">
      <div
        className={`${body.className} relative overflow-hidden rounded-2xl p-6 sm:p-8`}
        style={{
          background: `radial-gradient(600px 300px at 90% 0%, rgba(127,231,240,.14), transparent 70%), ${C.panel}`,
          border: `1px solid ${C.line}`,
          boxShadow: "0 30px 80px -40px rgba(127,231,240,.35)",
        }}
      >
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_200px] lg:grid-cols-[minmax(0,1fr)_200px_280px]">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em]" style={{ color: C.muted }}>
              Cybersecurity logic puzzle · unlimited
            </div>
            <h2 className={`${display.className} mt-1 text-3xl font-bold sm:text-4xl`}>
              Zone<span style={{ color: C.byte, textShadow: "0 0 18px rgba(127,231,240,.45)" }}>Guard</span>
            </h2>
            <div className="mb-3 text-[13px] tracking-wide" style={{ color: C.muted }}>
              by AvaByteGuard
            </div>
            <p className="mb-4 max-w-[60ch] text-gray-300">
              Every network zone needs one IDS sensor. Place one per row, column and zone, and never let two sensors
              touch. A new puzzle every time, from 5×5 to 9×9.
            </p>
            <p className="mb-6 text-[15px]" style={{ color: C.fg }}>
              {leader ? (
                <>
                  Can you beat <b style={{ color: C.gold }}>{leader.name}</b>&apos;s{" "}
                  <b className={`${mono.className} tabular-nums`}>{leader.score.toLocaleString("en-US")}</b> points?
                </>
              ) : (
                "Solve a puzzle fast to top the Zone Guard ranking."
              )}
            </p>
            <button
              onClick={() => setOpen(true)}
              className="rounded-md px-6 py-3 font-semibold uppercase tracking-wider text-white hover:brightness-110"
              style={{ background: C.red, boxShadow: "0 6px 20px -6px rgba(230,57,70,.7)" }}
            >
              Play Zone Guard
            </button>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open Zone Guard"
            className="mx-auto grid aspect-square w-full max-w-[200px] grid-cols-5 overflow-hidden rounded-lg"
            style={{ border: `3px solid ${C.ink}`, boxShadow: "0 12px 40px -16px rgba(127,231,240,.45)" }}
          >
            {SAMPLE.map((row, r) =>
              row.map((zone, c) => {
                const m = SAMPLE_MARKS[`${r},${c}`];
                const e = (a: number | undefined) => (a === undefined || a !== zone ? `2px solid ${C.ink}` : "1px solid rgba(6,9,18,.35)");
                return (
                  <span
                    key={`${r}-${c}`}
                    className="flex items-center justify-center"
                    style={{
                      background: ZONE_COLORS[zone],
                      borderTop: e(SAMPLE[r - 1]?.[c]),
                      borderBottom: e(SAMPLE[r + 1]?.[c]),
                      borderLeft: e(row[c - 1]),
                      borderRight: e(row[c + 1]),
                    }}
                  >
                    {m === SENSOR && <SensorIcon className="h-[70%] w-[70%]" spin={false} />}
                    {m === CROSS && <CrossIcon className="h-[45%] w-[45%]" />}
                  </span>
                );
              })
            )}
          </button>
          <div
            className="min-w-0 self-start rounded-xl p-4 md:col-span-2 lg:col-span-1"
            style={{ background: "rgba(6,9,18,.6)", border: `1px solid ${C.line}` }}
          >
            <Leaderboard board={board} limit={5} game="zoneguard" />
          </div>
        </div>
      </div>

      {open && <ZoneGuardModal onClose={() => setOpen(false)} board={board} submit={submit} />}
    </section>
  );
}
