"use client";

import { useEffect, useRef, useState } from "react";
import { Ava, C, LIGHT, Leaderboard, NameEntry, TEST_MODE, body, display, mono, useLeaderboard, type Board, type Row } from "./ByteMuncher";

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
// soft, clearly different colours so each zone reads at a glance
const ZONE_COLORS = ["#E8A55B", "#5A7BD6", "#E27BA9", "#4DB6AC", "#E2C35A", "#A07ADB", "#9CCB6C", "#B07A52", "#8FB3D9"];
const shade = (hex: string, k: number) => {
  const v = parseInt(hex.slice(1), 16);
  const ch = (x: number) => Math.max(0, Math.min(255, Math.round(x * k)));
  return `rgb(${ch(v >> 16)}, ${ch((v >> 8) & 255)}, ${ch(v & 255)})`;
};
// a raised, rounded tile like a board-game piece
const tile = (hex: string, radius: number) => ({
  background: `linear-gradient(180deg, ${hex}, ${shade(hex, 0.86)})`,
  borderRadius: radius,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.28), inset 0 -3px 0 rgba(0,0,0,.18)",
});
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
      {/* chunky white cross with rounded ends */}
      <path d="M6 6 L18 18 M18 6 L6 18" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

// one sensor per zone, tinted with its zone colour; deployed ones fade out
function TraySensor({ color, done }: { color: string; done: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-full w-full transition-all duration-300"
      style={{ opacity: done ? 0.22 : 1, transform: done ? "scale(.8)" : "scale(1)" }}
    >
      <circle cx="12" cy="12" r="10.5" fill={color} />
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
      <circle cx="12" cy="12" r="6.2" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".9" />
      <path d="M12 12 L12 3.5 A8.5 8.5 0 0 1 19.4 7.8 Z" fill="rgba(255,255,255,.45)" />
      <circle cx="12" cy="12" r="2.3" fill="#fff" />
      <circle cx="16" cy="8" r="1.2" fill="#fff" />
    </svg>
  );
}

// small 3x3 diagrams for the rules strip
function RuleIcon({ kind }: { kind: "zone" | "line" | "touch" }) {
  const cells = [...Array(9).keys()];
  const fill = (i: number) => {
    const r = Math.floor(i / 3),
      c = i % 3;
    if (kind === "zone") return i === 4 || i === 1 || i === 3 ? ZONE_COLORS[0] : "#ECE8E1";
    if (kind === "line") return r === 1 || c === 1 ? ZONE_COLORS[1] : "#ECE8E1";
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
    <div className="grid h-8 w-8 shrink-0 grid-cols-3 gap-[2px] sm:h-11 sm:w-11">
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

/* ---------- gentle sounds (Web Audio, starts after the first tap) ---------- */
let actx: AudioContext | null = null;
let soundOn = true;
function setSoundEnabled(on: boolean) {
  soundOn = on;
  try {
    localStorage.setItem("zg-sound", on ? "on" : "off");
  } catch {}
}
function readSoundPref() {
  try {
    soundOn = localStorage.getItem("zg-sound") !== "off";
  } catch {}
  return soundOn;
}
function tone(f: number, dur: number, peak = 0.05, delay = 0, slideTo = 0, type: OscillatorType = "sine") {
  if (!soundOn) return;
  try {
    if (!actx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      actx = new AC();
    }
    const a = actx;
    const t = a.currentTime + delay;
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + Math.min(0.12, dur));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}
const sfx = {
  cross: () => tone(520, 0.08, 0.025, 0, 0, "triangle"), // soft tick
  sensor: () => {
    tone(392, 0.16, 0.06, 0, 587); // bubbly "bloop"
    tone(1175, 0.22, 0.016, 0.05); // little shimmer
  },
  remove: () => tone(440, 0.12, 0.035, 0, 294),
  hint: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.3, 0.03, i * 0.08)),
  win: () => {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.32, 0.045, i * 0.11)); // music-box tune
    [2093, 2637].forEach((f, i) => tone(f, 0.5, 0.012, 0.8 + i * 0.1));
  },
};

/* ---------- Ava's lines ---------- */
const HELLO = "Hi, I'm Ava! Each color is a network zone. Tap a tile once for ✕, twice for a sensor.";
const ON_SENSOR = ["Sensor online!", "Nice spot!", "That zone feels safer already.", "Keep going, analyst!", "Ooh, good placement."];
const ON_CROSS = ["Good thinking. ✕ means no sensor here.", "Ruling cells out is half the job.", "Drag your finger to mark many ✕ at once."];
const ON_REMOVE = ["Rethinking is part of security.", "No worries, try another spot."];
const WRONG = "Hmm, something overlaps. Check rows, columns, zones and touching neighbors.";
const CHEERS = ["You did it, defender!", "Every zone is safe. Bravo!", "Textbook network defense!", "Wow, that was smooth!", "Attackers have nowhere to hide now!"];
const TIPS = [
  "IDS means Intrusion Detection System: it watches network traffic and raises the alarm, just like your sensors.",
  "Network segmentation splits a network into zones, so one breach can't spread everywhere.",
  "Security teams watch their alerts from a SOC, a Security Operations Center.",
  "Keep your devices updated: many attacks use bugs that already have a patch.",
  "A honeypot is a fake system set up to lure attackers and study them.",
  "A password manager lets you use a different strong password on every site.",
  "Multi-factor authentication stops most attacks that rely on a stolen password.",
];
const CONFETTI_COLORS = ["#E8A55B", "#5A7BD6", "#E27BA9", "#4DB6AC", "#E2C35A", "#A07ADB", "#7FE7F0", "#E63946"];
type Bit = { left: number; delay: number; dur: number; color: string; rot: number; size: number };
const makeConfetti = (): Bit[] =>
  Array.from({ length: 36 }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 1.8 + Math.random() * 1.4,
    color: pick(CONFETTI_COLORS),
    rot: Math.random() * 360,
    size: 6 + Math.random() * 6,
  }));
function bump(key: string) {
  try {
    const v = (Number(localStorage.getItem(key)) || 0) + 1;
    localStorage.setItem(key, String(v));
    return v;
  } catch {
    return 1;
  }
}
function bumpToday() {
  const d = new Date().toISOString().slice(0, 10);
  try {
    const raw = JSON.parse(localStorage.getItem("zg-today") || "{}") as { d?: string; n?: number };
    const n = raw.d === d ? (raw.n || 0) + 1 : 1;
    localStorage.setItem("zg-today", JSON.stringify({ d, n }));
    return n;
  } catch {
    return 1;
  }
}
const secsText = (ms: number) => {
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s} s` : fmt(ms);
};

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
const L = LIGHT; // the game window uses the light theme
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
  const [bubble, setBubble] = useState(HELLO);
  const [win, setWin] = useState<{ cheer: string; facts: string[]; tip: string } | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [confetti, setConfetti] = useState<Bit[]>([]);
  const [sound, setSound] = useState(readSoundPref);
  const toggleSound = () => {
    setSoundEnabled(!sound);
    setSound(!sound);
  };
  const save = async (r: Row) => {
    setMe(r.name);
    return submit(r);
  };
  // finger/mouse drag: once the pointer leaves the first tile, every empty tile it crosses gets an ✕
  const drag = useRef<{ r: number; c: number; prev: number; active: boolean } | null>(null);
  const dragOverRef = useRef<(x: number, y: number) => void>(() => {});

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
  const deployed = new Set<number>();
  marks.forEach((row, r) => row.forEach((m, c) => m === SENSOR && deployed.add(puzzle.zones[r][c])));
  const toDeploy = puzzle.n - deployed.size;
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
      const isBest = !prev || time < prev;
      if (isBest) {
        try {
          localStorage.setItem(`zg-best-${puzzle.n}`, String(time));
        } catch {}
        setBest(time);
        setNewBest(true);
      }
      const total = bump("zg-solved");
      const today = bumpToday();
      const size = `${puzzle.n}×${puzzle.n}`;
      const facts = [
        isBest
          ? prev
            ? `New personal best on ${size}: ${secsText(prev - time)} faster than before!`
            : `Your first ${size} network! ${fmt(time)} is now your time to beat.`
          : `Your best on ${size} is ${fmt(prev)}. Only ${secsText(time - prev)} away!`,
        hintsUsed === 0 ? "Perfect run: you didn't need a single hint." : `You used ${hintsUsed} hint${hintsUsed > 1 ? "s" : ""}. Can you do the next one without?`,
        // the last two only show on bigger screens, to keep the phone card short
        `You took about ${Math.max(1, Math.round(time / 1000 / puzzle.n))} seconds per zone.`,
        `Puzzles solved: ${total} in total, ${today} today.`,
      ];
      setWin({ cheer: pick(CHEERS), facts, tip: pick(TIPS) });
      setShowCard(true);
      setConfetti(makeConfetti());
      setBubble("All zones are protected. Want another network?");
      sfx.win();
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
    setWin(null);
    setShowCard(false);
    setConfetti([]);
    setBubble(pick(["New network, new challenge. You've got this!", "Fresh puzzle! Start with the smallest zone.", "Let's secure another network!"]));
  }

  function press(r: number, c: number) {
    if (won) return;
    const prev = marksRef.current[r][c];
    drag.current = { r, c, prev, active: false };
    if (hinted.has(`${r},${c}`)) return;
    const next = marksRef.current.map((row) => [...row]);
    next[r][c] = (next[r][c] + 1) % 3; // empty → ✕ → sensor → empty
    if (next[r][c] === CROSS) {
      sfx.cross();
      if (marksRef.current.flat().every((m) => m !== CROSS)) setBubble(pick(ON_CROSS));
    } else if (next[r][c] === SENSOR) {
      sfx.sensor();
      setBubble(pick(ON_SENSOR));
    } else {
      sfx.remove();
      setBubble(pick(ON_REMOVE));
    }
    commit(next);
  }
  function dragOver(x: number, y: number) {
    const d = drag.current;
    if (!d || won) return;
    const el = document.elementFromPoint(x, y)?.closest("[data-cell]") as HTMLElement | null;
    if (!el) return;
    const r = Number(el.dataset.r),
      c = Number(el.dataset.c);
    if (r === d.r && c === d.c) return;
    const next = marksRef.current.map((row) => [...row]);
    let changed = false;
    if (!d.active) {
      // it's a drag, not a tap: the first tile becomes ✕ too (a sensor or a hint stays as it was)
      d.active = true;
      const keep = d.prev === SENSOR || hinted.has(`${d.r},${d.c}`);
      const first = keep ? d.prev : CROSS;
      if (next[d.r][d.c] !== first) {
        next[d.r][d.c] = first;
        changed = true;
      }
    }
    if (next[r]?.[c] === EMPTY) {
      next[r][c] = CROSS;
      changed = true;
    }
    if (!changed) return;
    sfx.cross();
    commit(next);
  }

  // follow the finger anywhere on the page, so the drag never gets lost
  useEffect(() => {
    dragOverRef.current = dragOver;
  });
  useEffect(() => {
    const move = (e: PointerEvent) => dragOverRef.current(e.clientX, e.clientY);
    const end = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

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
    sfx.hint();
    setBubble("Here's a clue! I marked it with a gold ring.");
    commit(next, HINTS - hintsLeft + 1);
  }

  // test mode only: fill in the solution to preview the winning screen
  function testSolve() {
    const next = puzzle.zones.map((row, r) => row.map((_, c) => (puzzle.solution[r] === c ? SENSOR : CROSS)));
    commit(next);
  }

  function clearBoard() {
    if (won) return;
    const next = marksRef.current.map((row, r) => row.map((m, c) => (hinted.has(`${r},${c}`) ? m : EMPTY)));
    marksRef.current = next;
    setMarksState(next);
  }

  const elapsed = startAt === null ? 0 : (doneAt ?? now) - startAt;
  const z = puzzle.zones;
  const gap = puzzle.n <= 6 ? 5 : puzzle.n === 7 ? 4 : 3;
  const radius = puzzle.n <= 6 ? 10 : puzzle.n === 7 ? 8 : 6;

  return (
    <div
      className={`${body.className} fixed inset-0 z-50 overflow-y-auto`}
      style={{
        color: L.fg,
        background: `radial-gradient(1100px 560px at 50% -10%, rgba(30,154,166,.07), transparent 60%), ${L.ink}`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Zone Guard"
    >
      <style>{`@keyframes zgSpin{to{transform:rotate(360deg)}}.zg-spin{animation:zgSpin 3s linear infinite}
@keyframes zgPop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}.zg-pop{animation:zgPop .32s ease-out}
@keyframes zgBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}.zg-bounce{animation:zgBounce 1.2s ease-in-out infinite}
@keyframes zgFall{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(540deg)}}.zg-fall{animation:zgFall linear forwards}
@keyframes zgIn{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}.zg-in{animation:zgIn .35s ease-out}
@keyframes zgWiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}.zg-wiggle{animation:zgWiggle .4s ease-in-out}
@media (prefers-reduced-motion:reduce){.zg-spin,.zg-pop,.zg-bounce,.zg-fall,.zg-in,.zg-wiggle{animation:none}.zg-fall{display:none}}`}</style>
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 sm:py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex w-full min-w-0 items-start justify-between gap-3 sm:w-auto">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em]" style={{ color: L.muted }}>
              Logic puzzle · {puzzle.n}×{puzzle.n}
            </div>
            <h2 className={`${display.className} text-4xl leading-none font-bold sm:text-5xl`}>
              <span className="whitespace-nowrap">
                Zone<span style={{ color: L.byte }}>Guard</span>
              </span>
            </h2>
            <div className="mt-1 text-[13px] tracking-wide" style={{ color: L.muted }}>
              by AvaByteGuard
            </div>
          </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold hover:brightness-125 sm:hidden"
              style={{ background: "#F3F0FA", boxShadow: "inset 0 0 0 1px #DDD7CC" }}
            >
              ✕ Close
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["Time", fmt(elapsed)],
              ["Best", best ? fmt(best) : "–"],
              ["Sensors", `${sensors}/${puzzle.n}`],
            ].map(([label, value]) => (
              <div key={label} className="flex min-w-[64px] flex-col rounded-md px-2.5 py-1 sm:px-3 sm:py-1.5" style={{ background: L.panel, border: `1px solid ${L.line}` }}>
                <small className="text-[10px] uppercase tracking-[0.14em] sm:text-[11px]" style={{ color: L.muted }}>
                  {label}
                </small>
                <b className={`${mono.className} text-base font-bold tabular-nums leading-tight sm:text-xl`}>{value}</b>
              </div>
            ))}
            <button
              onClick={onClose}
              className="ml-1 hidden self-stretch rounded-md px-4 font-semibold hover:brightness-125 sm:block"
              style={{ background: "#F3F0FA", boxShadow: "inset 0 0 0 1px #DDD7CC" }}
            >
              ✕ Close
            </button>
          </div>
        </header>

        {/* rules */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["zone", "1 sensor per network color zone"],
              ["line", "1 sensor per row and column"],
              ["touch", "Sensors can't touch, not even diagonally"],
            ] as const
          ).map(([k, text]) => (
            <div
              key={k}
              className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-center sm:flex-row sm:gap-3 sm:px-3 sm:text-left"
              style={{ background: L.panel, border: `1px solid ${L.line}` }}
            >
              <RuleIcon kind={k} />
              <span className="text-[11px] leading-snug sm:text-[14px]">{text}</span>
            </div>
          ))}
        </div>

        {/* board */}
        <section
          className="flex flex-col items-center gap-3 rounded-2xl p-3 sm:p-4"
          style={{ background: L.panel, border: `1px solid ${L.line}`, boxShadow: "0 20px 50px -30px rgba(60,40,20,.25)" }}
        >
          <div className="relative" style={{ width: "min(100%, 380px, 52vh)" }}>
            {/* sensor tray: what is left to deploy */}
            <div className="flex flex-col items-center">
              <div
                className="flex items-center gap-1.5 rounded-t-2xl px-3 pt-2 pb-1.5"
                style={{ background: "#EEEAE3", boxShadow: `inset 0 1px 0 ${L.line}` }}
                aria-label={`${toDeploy} sensor${toDeploy === 1 ? "" : "s"} left to deploy`}
              >
                {Array.from({ length: puzzle.n }, (_, zone) => (
                  <span key={zone} className="block h-6 w-6 sm:h-7 sm:w-7">
                    <TraySensor color={ZONE_COLORS[zone % ZONE_COLORS.length]} done={deployed.has(zone)} />
                  </span>
                ))}
                <span className={`${mono.className} ml-1 text-[12px] font-bold tabular-nums`} style={{ color: toDeploy ? L.muted : L.byte }}>
                  {toDeploy ? `${toDeploy} left` : "all set"}
                </span>
              </div>
            </div>
            <div
              className="grid aspect-square w-full touch-none select-none rounded-2xl"
              style={{
                gridTemplateColumns: `repeat(${puzzle.n}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${puzzle.n}, minmax(0, 1fr))`,
                gap,
                padding: gap + 3,
                background: "#EEEAE3",
                boxShadow: `inset 0 0 0 1px ${L.line}, 0 12px 30px -18px rgba(60,40,20,.25)`,
              }}
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
                      className="relative flex items-center justify-center outline-none transition-transform active:scale-95 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white"
                      style={{
                        ...tile(ZONE_COLORS[zone % ZONE_COLORS.length], radius),
                        filter: won && m !== SENSOR ? "saturate(.5) brightness(.75)" : "none",
                      }}
                    >
                      {m === SENSOR && <SensorIcon className="zg-pop h-[66%] w-[66%] drop-shadow-[0_2px_4px_rgba(0,0,0,.35)]" />}
                      {m === CROSS && <CrossIcon className="h-[62%] w-[62%] drop-shadow-[0_1px_1px_rgba(60,40,20,.18)]" />}
                      {isHint && (
                        <span className="absolute inset-[6%] rounded-full" style={{ boxShadow: `0 0 0 2px ${L.gold}` }} aria-hidden="true" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {won && !showCard && (
              <button
                onClick={() => setShowCard(true)}
                className="absolute inset-x-0 bottom-3 z-20 mx-auto w-fit rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wider"
                style={{ background: L.byte, color: "#FFFFFF", boxShadow: "0 8px 24px -8px rgba(30,154,166,.6)" }}
              >
                See my results
              </button>
            )}
          </div>

          <div className="flex w-full max-w-[440px] items-center gap-2" aria-live="polite">
            <Ava className={`h-auto w-12 shrink-0 sm:w-14 ${won ? "zg-bounce" : ""}`} />
            <div
              key={wrongFull ? "wrong" : bubble}
              className={`zg-in relative rounded-2xl px-3 py-2 text-[13px] leading-snug ${wrongFull ? "zg-wiggle" : ""}`}
              style={{ background: wrongFull ? "#FFF4D6" : "#F3F0FA", color: wrongFull ? L.gold : L.fg, boxShadow: "inset 0 0 0 1px #DDD7CC" }}
            >
              <span
                aria-hidden="true"
                className="absolute top-1/2 -left-1.5 h-3 w-3 -translate-y-1/2 rotate-45"
                style={{ background: wrongFull ? "#FFF4D6" : "#F3F0FA", boxShadow: "-1px 1px 0 #DDD7CC" }}
              />
              <span className="relative">{wrongFull ? WRONG : bubble}</span>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Board size">
              {SIZES.map((s) => (
                <button
                  key={s.n}
                  onClick={() => newPuzzle(s.n)}
                  aria-pressed={puzzle.n === s.n}
                  className="flex flex-col items-center rounded-md px-2.5 py-1 leading-tight"
                  style={{
                    background: puzzle.n === s.n ? L.byte : "transparent",
                    color: puzzle.n === s.n ? "#FFFFFF" : L.fg,
                    boxShadow: puzzle.n === s.n ? "none" : "inset 0 0 0 1px #DDD7CC",
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
              {TEST_MODE && !won && (
                <button
                  onClick={testSolve}
                  className="rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wider"
                  style={{ background: "#FFE3A3", color: "#5A4300" }}
                >
                  Test: solve
                </button>
              )}
              <button
                onClick={toggleSound}
                aria-pressed={sound}
                className="rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wider"
                style={{ boxShadow: "inset 0 0 0 1px #DDD7CC" }}
              >
                {sound ? "Sound on" : "Sound off"}
              </button>
              <button
                onClick={hint}
                disabled={won || hintsLeft === 0}
                className="rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider disabled:opacity-40"
                style={{ boxShadow: `inset 0 0 0 1px ${L.gold}88`, color: L.gold }}
              >
                Hint ({hintsLeft})
              </button>
              <button
                onClick={clearBoard}
                disabled={won}
                className="rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider disabled:opacity-40"
                style={{ boxShadow: "inset 0 0 0 1px #DDD7CC" }}
              >
                Clear
              </button>
              <button
                onClick={() => newPuzzle()}
                className="rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white"
                style={{ background: L.red }}
              >
                New puzzle
              </button>
            </div>
          </div>
        </section>

        <div
          className="mx-auto flex w-full max-w-md flex-col gap-2 rounded-xl p-3"
          style={{ background: L.panel, border: `1px solid ${L.line}` }}
        >
          <Leaderboard board={board} highlight={me} game="zoneguard" compact light />
          <p className="text-[11px] leading-snug" style={{ color: L.muted }}>
            Points: bigger board = more points ({BASE[5]}–{BASE[9]}), up to double if you solve fast, −25% per hint.
          </p>
        </div>
      </div>

      {won && showCard && win && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4"
          style={{ background: "rgba(42,35,64,.32)", backdropFilter: "blur(3px)" }}
          role="dialog"
          aria-label="Puzzle solved"
        >
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
            {confetti.map((b, i) => (
              <span
                key={i}
                className="zg-fall absolute top-0 rounded-[2px]"
                style={{
                  left: `${b.left}%`,
                  width: b.size,
                  height: b.size * 0.6,
                  background: b.color,
                  transform: `rotate(${b.rot}deg)`,
                  animationDuration: `${b.dur}s`,
                  animationDelay: `${b.delay}s`,
                }}
              />
            ))}
          </div>
          <div
            className="zg-in relative my-auto w-full max-w-md rounded-3xl p-4 sm:p-6"
            style={{ background: L.panel, border: `1px solid ${L.line}`, boxShadow: "0 30px 80px -20px rgba(42,35,64,.35)" }}
          >
            <div className="flex items-end gap-3">
              <Ava className="zg-bounce h-auto w-20 shrink-0 sm:w-28" />
              <div className="relative mb-4 min-w-0 rounded-2xl px-4 py-3" style={{ background: "#F3F0FA", color: L.fg }}>
                <span aria-hidden="true" className="absolute bottom-4 -left-1.5 h-3 w-3 rotate-45" style={{ background: "#F3F0FA" }} />
                <p className={`${display.className} relative text-lg leading-tight sm:text-xl`}>Network secured!</p>
                <p className="relative mt-1 text-[14px]">{win.cheer}</p>
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-3 border-y py-3" style={{ borderColor: L.line }}>
              <span className={`${mono.className} text-3xl font-bold tabular-nums`} style={{ color: L.gold }}>
                +{points.toLocaleString("en-US")} pts
              </span>
              <span className="text-right text-[13px]" style={{ color: L.muted }}>
                {puzzle.n}×{puzzle.n} in{" "}
                <b className={`${mono.className} tabular-nums`} style={{ color: L.fg }}>
                  {fmt(elapsed)}
                </b>
                {newBest ? <span style={{ color: L.byte }}> · best!</span> : null}
              </span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 text-[13px] sm:text-[14px]">
              {win.facts.map((f, i) => (
                <li key={f} className={`${i >= 2 ? "hidden sm:flex" : "flex"} gap-2`}>
                  <span aria-hidden="true" style={{ color: L.byte }}>
                    ◆
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-xl px-3 py-2 text-[12px] leading-snug sm:text-[13px]" style={{ background: "rgba(30,154,166,.08)", color: L.fg }}>
              <b style={{ color: L.byte }}>Ava&apos;s cyber tip: </b>
              {win.tip}
            </p>
            <div className="mt-4 flex justify-center">
              <NameEntry key={doneAt ?? 0} score={points} level={puzzle.n} time={Math.max(1, Math.round(elapsed / 1000))} submit={save} light />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => newPuzzle()}
                className="rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider text-white"
                style={{ background: L.red }}
              >
                New puzzle
              </button>
              {puzzle.n < 9 && (
                <button
                  onClick={() => newPuzzle(puzzle.n + 1)}
                  className="rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider"
                  style={{ boxShadow: "inset 0 0 0 1px #DDD7CC" }}
                >
                  Try {puzzle.n + 1}×{puzzle.n + 1}
                </button>
              )}
              <button
                onClick={() => setShowCard(false)}
                className="rounded-md px-4 py-2.5 text-sm font-semibold uppercase tracking-wider"
                style={{ color: L.muted }}
              >
                See board
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="h-full">
      <div
        className={`${body.className} flex h-full items-center gap-4 rounded-xl p-3 sm:p-4`}
        style={{ background: C.panel, border: `1px solid ${C.line}` }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Zone Guard"
          className="grid aspect-square w-24 shrink-0 grid-cols-5 grid-rows-5 gap-[2px] rounded-lg p-[4px] sm:w-28"
          style={{ background: "#0B1020", boxShadow: `inset 0 0 0 1px ${C.line}` }}
        >
          {SAMPLE.map((row, r) =>
            row.map((zone, c) => {
              const m = SAMPLE_MARKS[`${r},${c}`];
              return (
                <span key={`${r}-${c}`} className="flex items-center justify-center" style={tile(ZONE_COLORS[zone], 4)}>
                  {m === SENSOR && <SensorIcon className="h-[72%] w-[72%]" spin={false} />}
                  {m === CROSS && <CrossIcon className="h-[60%] w-[60%]" />}
                </span>
              );
            })
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: C.muted }}>
            Logic puzzle · unlimited
          </div>
          <h3 className={`${display.className} text-xl font-bold leading-tight`}>
            Zone<span style={{ color: C.byte }}>Guard</span>
          </h3>
          <p className="mt-1 text-[13px] leading-snug text-gray-300">
            Place one IDS sensor per color zone, row and column, without letting two touch.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              onClick={() => setOpen(true)}
              className="rounded-md px-4 py-1.5 text-[13px] font-semibold uppercase tracking-wider text-white hover:brightness-110"
              style={{ background: C.red }}
            >
              Play
            </button>
            {leader && (
              <span className="text-[12px]" style={{ color: C.muted }}>
                Top: <b style={{ color: C.gold }}>{leader.name}</b>{" "}
                <span className={`${mono.className} tabular-nums`}>{leader.score.toLocaleString("en-US")}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {open && <ZoneGuardModal onClose={() => setOpen(false)} board={board} submit={submit} />}
    </div>
  );
}
