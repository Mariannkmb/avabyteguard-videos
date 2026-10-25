"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chakra_Petch, JetBrains_Mono, Silkscreen } from "next/font/google";

const display = Silkscreen({ weight: ["400", "700"], subsets: ["latin"] });
const body = Chakra_Petch({ weight: ["400", "500", "600"], subsets: ["latin"] });
const mono = JetBrains_Mono({ weight: ["500", "700"], subsets: ["latin"] });

/* ================= palette ================= */
const C = {
  ink: "#090C15",
  panel: "#10152A",
  line: "#1C2442",
  red: "#E63946",
  byte: "#7FE7F0",
  bug: "#F4A261",
  virus: "#A6DB5A",
  ids: "#B48CFF",
  fire: "#FF8A3D",
  gold: "#FFD166",
  muted: "#8C96B4",
  fg: "#E8ECF7",
};

/* ================= levels ================= */
export const LEVELS = 5;
// Test shortcuts: only on your Mac (npm run dev) or in the preview build, never on the published site
const TEST_MODE = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_BM_TEST === "1";
// Boards grow with the levels: 11x11, 13x13, then three 15x15 networks
const MAZES = [
  [
    "###########",
    "#o...#...o#",
    "#.##.#.##.#",
    "#V........#",
    "#.#.#B#.#.#",
    "T...#B#...T",
    "#.#.....#.#",
    "#a..#.#..a#",
    "#.##...##.#",
    "#o...P...o#",
    "###########",
  ],
  [
    "#############",
    "#o....#....o#",
    "#.##.#.#.##.#",
    "#.....V.....#",
    "#.##.###.##.#",
    "T...#BBB#...T",
    "#.#.......#.#",
    "#a..##.##..a#",
    "#.##..P..##.#",
    "#....#.#....#",
    "#.##.....##.#",
    "#o....V....o#",
    "#############",
  ],
  [
    "###############",
    "#o.....#.....o#",
    "#.###.#.#.###.#",
    "#......V......#",
    "#.##.#####.##.#",
    "#....#BBB#....#",
    "T..#.......#..T",
    "#.##.##.##.##.#",
    "#a.....P.....a#",
    "#.##.#####.##.#",
    "#....#.V.#....#",
    "###.##...##.###",
    "#.....#.#.....#",
    "#o.....V.....o#",
    "###############",
  ],
  [
    "###############",
    "#o...#...#...o#",
    "#.#.##.#.##.#.#",
    "#.#....V....#.#",
    "T...##.#.##...T",
    "##.#.#...#.#.##",
    "#....#BBB#....#",
    "#.##.##.##.##.#",
    "#a.....P.....a#",
    "#.#.###.###.#.#",
    "#.#...#V#...#.#",
    "#...#.....#...#",
    "#.#.#.###.#.#.#",
    "#o.....V.....o#",
    "###############",
  ],
  [
    "###############",
    "#o.....#.....o#",
    "#.##.#.#.#.##.#",
    "#.#..#...#..#.#",
    "#.#.##.V.##.#.#",
    "#......#......#",
    "###.#.BBB.#.###",
    "T...#.###.#...T",
    "#a#....P....#a#",
    "#.#.##.#.##.#.#",
    "#....#.V.#....#",
    "##.#.#.#.#.#.##",
    "#..#...#...#..#",
    "#o.....V.....o#",
    "###############",
  ],
];
const TIERS = [
  { base: "#13304A", trace: "#2C6E8F", hi: "#6CC3E8", name: "Home network" },
  { base: "#14382C", trace: "#2F7A5A", hi: "#6FD3A0", name: "Small office" },
  { base: "#16264A", trace: "#2B4A8A", hi: "#5B86D9", name: "Corporate LAN" },
  { base: "#24194A", trace: "#5B3FA8", hi: "#A98BF0", name: "Cloud mesh" },
  { base: "#103A3A", trace: "#1F7A74", hi: "#5FD3C8", name: "Core datacenter" },
];
const tierFor = (lv: number) => Math.min(4, lv - 1);
const VIRUS_COUNT = [1, 1, 1, 2, 2];
const BUG_COUNT = [2, 2, 2, 2, 3];
const RANKS = ["Analyst", "Threat Hunter", "Security Engineer", "Security Architect", "CISO"];
const RANK_EMBLEM = ["rgba(255,255,255,.2)", "#7FE7F0", "#A98BF0", "#F4A261", "#FFD166"];
const MAX_LIVES = 5;
const LIFE_EVERY = 2500;

type Power = "key" | "backup" | "ids" | "firewall" | "ai";
const POWERS: Record<Power, { name: string; desc: string; from: number }> = {
  key: { name: "Encryption key", desc: "Surprise bonus. Grab it before it vanishes.", from: 1 },
  backup: { name: "Backup", desc: "Database icon with a red cross. Adds one shield (up to 5).", from: 1 },
  ids: { name: "IDS radar", desc: "Intrusion detected: every threat freezes for 5 s.", from: 2 },
  firewall: { name: "Firewall mode", desc: "Patch-Man becomes a firewall for 6 s and burns through bugs and viruses.", from: 3 },
  ai: { name: "AI copilot", desc: "An AI drone zaps any bug that gets close for 8 s.", from: 4 },
};
const UNLOCK: Record<number, Power> = { 2: "ids", 3: "firewall", 4: "ai" };

type Dir = "up" | "down" | "left" | "right";
type Vec = [number, number];
type Cell = { r: number; c: number };
type Ent = Cell & { pr: number; pc: number; d: Vec };
type Player = Ent & { face: Dir };
type Bug = Ent & { home: Cell; delay: number };
type Virus = Ent & { spin: number };
type Bonus = Cell & { kind: Power; until: number };
type Zap = { x1: number; y1: number; x2: number; y2: number; until: number };
type Phase = "ready" | "playing" | "paused" | "dying" | "won" | "over" | "victory";
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
export type Hud = {
  score: number;
  best: number;
  level: number;
  lives: number;
  phase: Phase;
  reason: string;
  total: number;
  toast: { id: number; text: string; color: string } | null;
  effects: { label: string; secs: number; color: string }[];
  runId: number;
};

const DIRS: Record<Dir, Vec> = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

/* ================= sprites ================= */
type G = CanvasRenderingContext2D;
function shield(g: G, x: number, y: number, r: number, col: string) {
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x + r * 0.9, y - r * 0.8, x + r * 0.85, y - r * 0.55);
  g.quadraticCurveTo(x + r * 0.85, y + r * 0.45, x, y + r);
  g.quadraticCurveTo(x - r * 0.85, y + r * 0.45, x - r * 0.85, y - r * 0.55);
  g.quadraticCurveTo(x - r * 0.9, y - r * 0.8, x, y - r);
  g.fillStyle = col;
  g.fill();
}
function drawByte(g: G, x: number, y: number, s: number) {
  g.save();
  g.translate(x, y);
  g.rotate(Math.PI / 4);
  g.shadowColor = C.byte;
  g.shadowBlur = s * 0.6;
  g.fillStyle = C.byte;
  const k = s * 0.11;
  g.fillRect(-k, -k, k * 2, k * 2);
  g.restore();
}
// security patch = a red bandage (not a shield, so it isn't confused with the shields/lives)
function drawPatch(g: G, x: number, y: number, s: number, time: number) {
  const p = 1 + Math.sin(time / 180) * 0.1;
  const w = s * 0.36,
    h = s * 0.15;
  g.save();
  g.translate(x, y);
  g.rotate(-Math.PI / 5);
  g.scale(p, p);
  g.shadowColor = C.red;
  g.shadowBlur = s * 0.6;
  g.fillStyle = C.red;
  g.beginPath();
  g.roundRect(-w, -h, w * 2, h * 2, h);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = "#F6D6D9";
  g.beginPath();
  g.roundRect(-w * 0.38, -h * 0.8, w * 0.76, h * 1.6, h * 0.3);
  g.fill();
  g.fillStyle = "rgba(255,255,255,.6)";
  for (const xx of [-w * 0.72, -w * 0.55, w * 0.55, w * 0.72])
    for (const yy of [-h * 0.35, h * 0.35]) {
      g.beginPath();
      g.arc(xx, yy, s * 0.02, 0, Math.PI * 2);
      g.fill();
    }
  g.restore();
}
function drawPlayer(g: G, x: number, y: number, s: number, face: Dir, mouth: number, emblem: string, fw: boolean, time: number) {
  const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[face];
  const m = 0.08 + 0.28 * mouth,
    r = s * 0.42;
  g.save();
  g.translate(x, y);
  if (fw) {
    // flame aura
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + time / 300;
      const fl = r * (1.1 + 0.18 * Math.sin(time / 70 + i * 2));
      g.fillStyle = i % 2 ? "rgba(255,138,61,.55)" : "rgba(255,209,102,.45)";
      g.beginPath();
      g.arc(Math.cos(a) * fl * 0.85, Math.sin(a) * fl * 0.85, r * 0.28, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.rotate(ang);
  const main = fw ? C.fire : C.red;
  g.shadowColor = main;
  g.shadowBlur = s * (fw ? 0.9 : 0.5);
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  gr.addColorStop(0, fw ? "#FFD9A0" : "#FF7A84");
  gr.addColorStop(1, main);
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(0, 0);
  g.arc(0, 0, r, m * Math.PI, (2 - m) * Math.PI);
  g.closePath();
  g.fill();
  g.shadowBlur = 0;
  if (fw) {
    // brick lines
    g.save();
    g.clip();
    g.strokeStyle = "rgba(110,30,0,.55)";
    g.lineWidth = s * 0.03;
    for (let yy = -r; yy < r; yy += r * 0.4) {
      g.beginPath();
      g.moveTo(-r, yy);
      g.lineTo(r, yy);
      g.stroke();
      const off = (Math.round(yy / (r * 0.4)) % 2) * r * 0.25;
      for (let xx = -r + off; xx < r; xx += r * 0.5) {
        g.beginPath();
        g.moveTo(xx, yy);
        g.lineTo(xx, yy + r * 0.4);
        g.stroke();
      }
    }
    g.restore();
  }
  g.rotate(-ang);
  if (!fw) {
    const ex = Math.cos(ang) * -r * 0.12,
      ey = Math.sin(ang) * -r * 0.12;
    g.globalAlpha = emblem.startsWith("rgba") ? 1 : 0.75;
    shield(g, ex, ey - r * 0.05, r * 0.36, emblem);
    g.globalAlpha = 1;
  }
  const eyeA = ang - Math.PI / 2.6;
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(Math.cos(eyeA) * r * 0.5, Math.sin(eyeA) * r * 0.5, r * 0.13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#120A12";
  g.beginPath();
  g.arc(
    Math.cos(eyeA) * r * 0.5 + Math.cos(ang) * r * 0.05,
    Math.sin(eyeA) * r * 0.5 + Math.sin(ang) * r * 0.05,
    r * 0.065,
    0,
    Math.PI * 2
  );
  g.fill();
  g.restore();
}
function drawBug(g: G, x: number, y: number, s: number, d: Vec, time: number, scared: boolean, flash: boolean) {
  const col = scared ? (flash ? C.fg : "#4D6CC0") : C.bug;
  const a = d[0] || d[1] ? Math.atan2(d[0], d[1]) : Math.PI / 2;
  g.save();
  g.translate(x, y);
  g.rotate(a + Math.PI / 2);
  const wig = Math.sin(time / 60) * s * 0.04;
  g.strokeStyle = col;
  g.lineWidth = s * 0.05;
  g.lineCap = "round";
  for (const side of [-1, 1])
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(side * s * 0.12, i * s * 0.11);
      g.lineTo(side * s * 0.32, i * s * 0.15 + (i === 0 ? wig : -wig) * side);
      g.stroke();
    }
  g.beginPath();
  g.moveTo(-s * 0.06, -s * 0.24);
  g.quadraticCurveTo(-s * 0.12, -s * 0.36, -s * 0.2, -s * 0.38 + wig);
  g.moveTo(s * 0.06, -s * 0.24);
  g.quadraticCurveTo(s * 0.12, -s * 0.36, s * 0.2, -s * 0.38 - wig);
  g.stroke();
  g.shadowColor = col;
  g.shadowBlur = s * 0.4;
  g.fillStyle = col;
  g.beginPath();
  g.ellipse(0, s * 0.04, s * 0.2, s * 0.26, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(0, -s * 0.2, s * 0.12, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = "rgba(0,0,0,.45)";
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.moveTo(0, -s * 0.1);
  g.lineTo(0, s * 0.3);
  g.stroke();
  g.fillStyle = "rgba(0,0,0,.45)";
  for (const [px, py] of [
    [-0.09, 0],
    [0.09, 0.02],
    [-0.08, 0.15],
    [0.1, 0.17],
  ]) {
    g.beginPath();
    g.arc(px * s, py * s, s * 0.035, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = scared ? "#fff" : "#120A12";
  g.beginPath();
  g.arc(-s * 0.05, -s * 0.23, s * 0.03, 0, Math.PI * 2);
  g.arc(s * 0.05, -s * 0.23, s * 0.03, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
function drawVirus(g: G, x: number, y: number, s: number, time: number, spin: number, weak = false, flash = false) {
  const p = 1 + Math.sin(time / 240 + spin) * 0.07;
  const col = weak ? (flash ? C.fg : "#9AA7C7") : C.virus;
  g.save();
  g.translate(x, y);
  g.rotate(time / 1400 + spin);
  g.scale(weak ? p * 0.85 : p, weak ? p * 0.85 : p);
  g.strokeStyle = col;
  g.fillStyle = col;
  g.lineWidth = s * 0.05;
  g.shadowColor = col;
  g.shadowBlur = s * 0.6;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.beginPath();
    g.moveTo(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2);
    g.lineTo(Math.cos(a) * s * 0.36, Math.sin(a) * s * 0.36);
    g.stroke();
    g.beginPath();
    g.arc(Math.cos(a) * s * 0.38, Math.sin(a) * s * 0.38, s * 0.045, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.arc(0, 0, s * 0.22, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = "rgba(10,20,6,.45)";
  for (const [a, r, k] of [
    [0.3, 0.1, 0.05],
    [2.2, 0.11, 0.04],
    [4, 0.08, 0.05],
    [5.2, 0.02, 0.035],
  ]) {
    g.beginPath();
    g.arc(Math.cos(a) * r * s, Math.sin(a) * r * s, k * s, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}
function drawAntivirus(g: G, x: number, y: number, s: number, time: number) {
  const p = 1 + Math.sin(time / 170) * 0.1;
  g.save();
  g.translate(x, y);
  g.rotate(-Math.PI / 4);
  g.scale(p, p);
  const w = s * 0.17,
    l = s * 0.26;
  g.shadowColor = C.virus;
  g.shadowBlur = s * 0.6;
  g.fillStyle = C.virus;
  g.beginPath();
  g.roundRect(-w, -l, w * 2, l, [w, w, 0, 0]);
  g.fill();
  g.fillStyle = "#F4F7FF";
  g.beginPath();
  g.roundRect(-w, 0, w * 2, l, [0, 0, w, w]);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = "rgba(255,255,255,.55)";
  g.beginPath();
  g.roundRect(-w * 0.55, -l * 0.8, w * 0.3, l * 0.6, w * 0.15);
  g.fill();
  g.restore();
}
function drawPower(g: G, kind: Power, x: number, y: number, s: number, time: number) {
  const bob = Math.sin(time / 220) * s * 0.05;
  g.save();
  g.translate(x, y + bob);
  g.lineCap = "round";
  g.lineJoin = "round";
  if (kind === "key") {
    g.shadowColor = C.gold;
    g.shadowBlur = s * 0.6;
    g.strokeStyle = C.gold;
    g.fillStyle = C.gold;
    g.lineWidth = s * 0.08;
    g.beginPath();
    g.arc(-s * 0.14, 0, s * 0.13, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(-s * 0.01, 0);
    g.lineTo(s * 0.32, 0);
    g.moveTo(s * 0.2, 0);
    g.lineTo(s * 0.2, s * 0.12);
    g.moveTo(s * 0.3, 0);
    g.lineTo(s * 0.3, s * 0.1);
    g.stroke();
  }
  if (kind === "backup") {
    g.shadowColor = C.byte;
    g.shadowBlur = s * 0.5;
    const w = s * 0.26,
      h = s * 0.1;
    g.fillStyle = "#DDF8FB";
    for (const yy of [s * 0.16, 0, -s * 0.16]) {
      g.beginPath();
      g.ellipse(0, yy, w, h, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(-w, yy - s * 0.08, w * 2, s * 0.08);
    }
    g.beginPath();
    g.ellipse(0, -s * 0.24, w, h, 0, 0, Math.PI * 2);
    g.fillStyle = C.byte;
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = C.red;
    g.fillRect(-s * 0.035, -s * 0.1, s * 0.07, s * 0.26);
    g.fillRect(-s * 0.13, -s * 0.005, s * 0.26, s * 0.07);
  }
  if (kind === "ids") {
    g.shadowColor = C.ids;
    g.shadowBlur = s * 0.5;
    g.strokeStyle = C.ids;
    g.lineWidth = s * 0.04;
    for (const rr of [0.14, 0.28]) {
      g.beginPath();
      g.arc(0, 0, s * rr, 0, Math.PI * 2);
      g.stroke();
    }
    const a = time / 250;
    g.fillStyle = "rgba(180,140,255,.45)";
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, s * 0.34, a, a + 0.9);
    g.closePath();
    g.fill();
    g.fillStyle = C.ids;
    g.beginPath();
    g.arc(s * 0.12, -s * 0.12, s * 0.04, 0, Math.PI * 2);
    g.fill();
  }
  if (kind === "firewall") {
    g.shadowColor = C.fire;
    g.shadowBlur = s * 0.6;
    const w = s * 0.62,
      h = s * 0.46;
    g.fillStyle = C.fire;
    g.fillRect(-w / 2, -h / 2 + s * 0.05, w, h);
    g.shadowBlur = 0;
    g.strokeStyle = "#6E1E00";
    g.lineWidth = s * 0.03;
    for (let i = 1; i < 3; i++) {
      const yy = -h / 2 + s * 0.05 + (h / 3) * i;
      g.beginPath();
      g.moveTo(-w / 2, yy);
      g.lineTo(w / 2, yy);
      g.stroke();
    }
    for (let row = 0; row < 3; row++)
      for (let k = 0; k < 3; k++) {
        const xx = -w / 2 + (w / 3) * k + (row % 2 ? w / 6 : 0);
        if (xx <= -w / 2 + 1) continue;
        const yy = -h / 2 + s * 0.05 + (h / 3) * row;
        g.beginPath();
        g.moveTo(xx, yy);
        g.lineTo(xx, yy + h / 3);
        g.stroke();
      }
    g.fillStyle = C.gold;
    g.beginPath();
    g.moveTo(-s * 0.08, -h / 2 + s * 0.05);
    g.quadraticCurveTo(-s * 0.1, -s * 0.36 + Math.sin(time / 90) * s * 0.03, 0, -s * 0.42);
    g.quadraticCurveTo(s * 0.1, -s * 0.3, s * 0.08, -h / 2 + s * 0.05);
    g.fill();
  }
  if (kind === "ai") drawDrone(g, 0, 0, s * 1.1, time);
  g.restore();
}
function drawDrone(g: G, x: number, y: number, s: number, time: number) {
  g.save();
  g.translate(x, y);
  g.shadowColor = C.byte;
  g.shadowBlur = s * 0.5;
  g.strokeStyle = C.fg;
  g.lineWidth = s * 0.04;
  g.beginPath();
  g.moveTo(0, -s * 0.18);
  g.lineTo(0, -s * 0.28);
  g.stroke();
  g.fillStyle = Math.floor(time / 200) % 2 ? C.red : C.byte;
  g.beginPath();
  g.arc(0, -s * 0.3, s * 0.045, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#DDE4F5";
  g.beginPath();
  g.roundRect(-s * 0.22, -s * 0.18, s * 0.44, s * 0.32, s * 0.1);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = "#0B1226";
  g.beginPath();
  g.roundRect(-s * 0.17, -s * 0.12, s * 0.34, s * 0.16, s * 0.06);
  g.fill();
  g.fillStyle = C.byte;
  g.beginPath();
  g.arc(-s * 0.07, -s * 0.04, s * 0.035, 0, Math.PI * 2);
  g.arc(s * 0.07, -s * 0.04, s * 0.035, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/* ================= engine ================= */
function createGame(cv: HTMLCanvasElement, onHud: (h: Hud) => void) {
  const ctx = cv.getContext("2d") as G;
  let walls: boolean[][] = [];
  let items: number[][] = [];
  let total = 0,
    left = 0;
  let startP: Cell = { r: 0, c: 0 };
  let bugHomes: Cell[] = [];
  let virusHomes: Cell[] = [];
  let player: Player = { r: 0, c: 0, pr: 0, pc: 0, d: [0, 0], face: "right" };
  let bugs: Bug[] = [];
  let viruses: Virus[] = [];
  let bonus: Bonus | null = null;
  let zaps: Zap[] = [];
  let spawns = 0;
  let score = 0,
    lives = 4,
    level = 1,
    best = 0,
    phase: Phase = "ready",
    reason = "",
    tick = 0,
    nextLife = LIFE_EVERY;
  let frightUntil = 0,
    idsUntil = 0,
    fwUntil = 0,
    aiUntil = 0,
    avUntil = 0,
    clock = 0;
  let acc = 0,
    last = 0,
    tickMs = 215,
    shake = 0,
    cs = 1,
    dpr = 1,
    deathAt = 0,
    raf = 0,
    toastId = 0,
    runId = 0;
  let toast: Hud["toast"] = null;
  let particles: Particle[] = [];
  let wallLayer: HTMLCanvasElement | null = null;
  let want: Dir | null = null;
  let sound = true;
  let actx: AudioContext | null = null;
  const timers: number[] = [];

  try {
    best = Number(localStorage.getItem("bm-best")) || 0;
  } catch {}

  function effects() {
    const list: Hud["effects"] = [];
    const add = (until: number, label: string, color: string) => {
      if (until > clock) list.push({ label, secs: Math.ceil((until - clock) / 1000), color });
    };
    add(frightUntil, "Patch", C.red);
    add(avUntil, "Antivirus", C.virus);
    add(idsUntil, "IDS", C.ids);
    add(fwUntil, "Firewall", C.fire);
    add(aiUntil, "AI copilot", C.byte);
    return list;
  }
  const emit = () => onHud({ score, best, level, lives, phase, reason, total, toast, effects: effects(), runId });
  const say = (text: string, color: string = C.fg) => {
    toast = { id: ++toastId, text, color };
  };
  let N = 15;
  const wrap = (c: number) => (c + N) % N;
  const open = (r: number, c: number) => r >= 0 && r < N && !walls[r][wrap(c)];

  function parse() {
    const map = MAZES[tierFor(level)];
    N = map.length;
    cs = cv.width / N;
    walls = [];
    items = [];
    bugHomes = [];
    virusHomes = [];
    total = 0;
    const avCells: Cell[] = [];
    map.forEach((row, r) => {
      walls[r] = [];
      items[r] = [];
      [...row].forEach((ch, c) => {
        walls[r][c] = ch === "#";
        items[r][c] = 0;
        if (ch === "." || ch === "V") {
          items[r][c] = 1;
          total++;
        }
        if (ch === "o") items[r][c] = 2;
        if (ch === "a") {
          items[r][c] = 1;
          total++;
          avCells.push({ r, c });
        }
        if (ch === "P") startP = { r, c };
        if (ch === "B") bugHomes.push({ r, c });
        if (ch === "V") virusHomes.push({ r, c });
      });
    });
    bugHomes = bugHomes.slice(0, BUG_COUNT[level - 1]);
    virusHomes = virusHomes.slice(0, VIRUS_COUNT[level - 1]);
    // antivirus capsules only matter when there are viruses; otherwise they stay plain bytes
    if (virusHomes.length)
      avCells.forEach(({ r, c }) => {
        items[r][c] = 3;
        total--;
      });
    left = total;
    spawns = 0;
    bonus = null;
    buildWalls();
    drawPortals();
  }
  function placeActors() {
    player = { ...startP, pr: startP.r, pc: startP.c, d: [0, 0], face: "right" };
    bugs = bugHomes.map((h, i) => ({
      ...h,
      pr: h.r,
      pc: h.c,
      d: [0, 0] as Vec,
      home: h,
      delay: 12 + i * 8,
    }));
    viruses = virusHomes.map((h) => ({ ...h, pr: h.r, pc: h.c, d: [0, 0] as Vec, spin: Math.random() * 6 }));
    want = null;
    frightUntil = idsUntil = fwUntil = aiUntil = avUntil = 0;
    target = null;
    zaps = [];
  }
  const touchDevice = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const setSpeed = () => {
    tickMs = Math.max(165, 230 - (level - 1) * 15) * (touchDevice ? 1.15 : 1);
  };
  // tap-to-go: the cell the player tapped, reached by the shortest path
  let target: Cell | null = null;
  function nextStepTo(goal: Cell): Dir | null {
    const key = (r: number, c: number) => r * N + c;
    const first = new Map<number, Dir>();
    const seen = new Set([key(player.r, player.c)]);
    const q: Cell[] = [{ r: player.r, c: player.c }];
    while (q.length) {
      const cur = q.shift() as Cell;
      if (cur.r === goal.r && cur.c === goal.c) return first.get(key(cur.r, cur.c)) ?? null;
      for (const d of Object.keys(DIRS) as Dir[]) {
        const [dr, dc] = DIRS[d];
        const nr = cur.r + dr,
          nc = wrap(cur.c + dc);
        if (!open(nr, nc) || seen.has(key(nr, nc))) continue;
        seen.add(key(nr, nc));
        first.set(key(nr, nc), first.get(key(cur.r, cur.c)) ?? d);
        q.push({ r: nr, c: nc });
      }
    }
    return null;
  }
  function tapAt(x: number, y: number) {
    const rect = cv.getBoundingClientRect();
    let r = Math.floor(((y - rect.top) / rect.height) * N),
      c = Math.floor(((x - rect.left) / rect.width) * N);
    r = Math.max(0, Math.min(N - 1, r));
    c = Math.max(0, Math.min(N - 1, c));
    if (walls[r][c]) {
      // tapped a wall: use the nearest open cell
      let bestD = Infinity;
      for (let rr = 0; rr < N; rr++)
        for (let cc = 0; cc < N; cc++)
          if (!walls[rr][cc]) {
            const d = Math.abs(rr - r) + Math.abs(cc - c);
            if (d < bestD) {
              bestD = d;
              r = rr;
              c = cc;
            }
          }
    }
    ensureAudio();
    if (phase === "ready") {
      phase = "playing";
      emit();
    }
    if (phase === "playing") target = { r, c };
  }
  function newGame() {
    runId++;
    score = 0;
    lives = 4;
    level = 1;
    reason = "";
    nextLife = LIFE_EVERY;
    toast = null;
    parse();
    placeActors();
    setSpeed();
    phase = "ready";
    emit();
  }
  function saveBest() {
    if (score > best) {
      best = score;
      try {
        localStorage.setItem("bm-best", String(best));
      } catch {}
    }
  }

  /* sound */
  function ensureAudio() {
    if (actx) return;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      actx = new AC();
    } catch {}
  }
  function beep(f: number, dur = 0.06, type: OscillatorType = "square", vol = 0.04, slide = 0) {
    if (!sound || !actx) return;
    const o = actx.createOscillator(),
      g = actx.createGain(),
      t = actx.currentTime;
    o.type = type === "sine" ? "sine" : "triangle"; // soft, toy-like timbre
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur);
  }
  // cute "bloop" per byte, climbing a music-box pentatonic scale while you keep eating
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19];
  let combo = 0,
    lastEat = 0;
  function tone(a: AudioContext, f: number, t: number, peak: number, dur: number, slideTo = 0) {
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function chomp(now: number) {
    combo = now - lastEat < 700 ? combo + 1 : 0;
    lastEat = now;
    if (combo > 0 && combo % 15 === 0) say(`Byte streak x${combo}!`, C.byte);
    const a = actx;
    if (!sound || !a) return;
    const idx = combo < SCALE.length ? combo : SCALE.length - 4 + (combo % 4);
    const f = 392 * Math.pow(2, SCALE[idx] / 12); // starts on G4
    const t = a.currentTime;
    tone(a, f * 0.75, t, 0.07, 0.13, f * 1.2); // bubbly bloop
    tone(a, f * 2, t + 0.025, 0.018, 0.2); // tiny glockenspiel shimmer
    if (combo > 0 && combo % 5 === 0)
      [2, 2.5, 3].forEach((m, i) => tone(a, f * m, t + 0.07 + i * 0.07, 0.03, 0.3));
  }
  const jingle = (notes: number[]) =>
    notes.forEach((n, i) => timers.push(window.setTimeout(() => beep(n, 0.12, "square", 0.05), i * 110)));

  function burst(r: number, c: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        s = 0.02 + Math.random() * 0.06;
      particles.push({ x: c + 0.5, y: r + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color });
    }
  }
  const dist = (r: number, c: number) => Math.abs(r - player.r) + Math.abs(c - player.c);
  function choose(e: Ent, mode: number, greed: number): Vec {
    // only Patch-Man can cross a side tunnel: enemies stop at the board edge
    const opts = Object.values(DIRS).filter(
      ([dr, dc]) => e.c + dc >= 0 && e.c + dc < N && open(e.r + dr, e.c + dc)
    );
    let pool = opts.filter(([dr, dc]) => !(dr === -e.d[0] && dc === -e.d[1]));
    if (!pool.length) pool = opts;
    if (!pool.length) return [0, 0];
    if (mode !== 0 && Math.random() < greed) {
      pool.sort((a, b) => mode * (dist(e.r + a[0], e.c + a[1]) - dist(e.r + b[0], e.c + b[1])));
      return pool[0];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* surprises */
  function pickPower(): Power {
    if (spawns === 0 && UNLOCK[level]) return UNLOCK[level];
    if (lives <= 1 && level >= 2 && Math.random() < 0.5) return "backup";
    const pool = (Object.keys(POWERS) as Power[]).filter((k) => POWERS[k].from <= level);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function spawnBonus(now: number) {
    const homes = new Set(bugHomes.map((h) => `${h.r},${h.c}`));
    const cells: Cell[] = [];
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        if (open(r, c) && c > 0 && c < N - 1 && dist(r, c) >= 5 && !homes.has(`${r},${c}`) && items[r][c] !== 2) cells.push({ r, c });
    if (!cells.length) return;
    const cell = cells[Math.floor(Math.random() * cells.length)];
    const kind = pickPower();
    bonus = { ...cell, kind, until: now + 12000 };
    say(`${POWERS[kind].name} appeared!`, C.gold);
    beep(1200, 0.08, "triangle", 0.05, 1600);
  }
  function applyPower(kind: Power, now: number) {
    const at = { r: player.r, c: player.c };
    if (kind === "key") {
      const pts = 300 + 100 * level;
      score += pts;
      say(`Encryption key +${pts}`, C.gold);
      burst(at.r, at.c, C.gold, 20);
    }
    if (kind === "backup") {
      if (lives < MAX_LIVES) {
        lives++;
        say("Backup restored: +1 shield", C.byte);
      } else {
        score += 500;
        say("Shields full: +500", C.byte);
      }
      burst(at.r, at.c, C.byte, 20);
    }
    if (kind === "ids") {
      idsUntil = now + 5000;
      say("IDS online: all threats frozen", C.ids);
      burst(at.r, at.c, C.ids, 20);
    }
    if (kind === "firewall") {
      fwUntil = now + 6000;
      say("Firewall mode: burn through threats", C.fire);
      burst(at.r, at.c, C.fire, 24);
    }
    if (kind === "ai") {
      aiUntil = now + 8000;
      say("AI copilot deployed", C.byte);
      burst(at.r, at.c, C.byte, 20);
    }
    jingle([660, 880, 1100]);
  }
  function sendHome(b: Bug, pts: number) {
    score += pts;
    burst(b.r, b.c, C.bug, 18);
    beep(520, 0.18, "triangle", 0.06, 1400);
    b.r = b.pr = b.home.r;
    b.c = b.pc = b.home.c;
    b.delay = 10;
    b.d = [0, 0];
  }

  function die(kind: "bug" | "virus", now: number) {
    shake = 14;
    burst(player.r, player.c, kind === "virus" ? C.virus : C.red, 26);
    beep(520, 0.18, "sine", 0.06, 390);
    timers.push(window.setTimeout(() => beep(390, 0.35, "sine", 0.06, 260), 170));
    lives--;
    reason = kind === "virus" ? "System infected" : "Out of shields";
    saveBest();
    if (lives <= 0) {
      phase = "over";
      timers.push(window.setTimeout(emit, 650));
      return;
    }
    say(`${kind === "virus" ? "Virus hit!" : "Bug hit!"} Shield lost, ${lives} left`, C.red);
    phase = "dying";
    deathAt = now;
    bonus = null;
    emit();
  }

  function step(now: number) {
    tick++;
    const frozen = now < idsUntil,
      fw = now < fwUntil,
      ai = now < aiUntil;
    player.pr = player.r;
    player.pc = player.c;
    if (target) {
      if (player.r === target.r && player.c === target.c) target = null;
      else want = nextStepTo(target) ?? want;
    }
    if (want) {
      const [dr, dc] = DIRS[want];
      if (open(player.r + dr, player.c + dc)) {
        player.d = [dr, dc];
        player.face = want;
      }
    }
    // auto-turn: if the way ahead is blocked and there is only one way on, take it
    if (!open(player.r + player.d[0], player.c + player.d[1]) && (player.d[0] || player.d[1])) {
      const ways = (Object.keys(DIRS) as Dir[]).filter((d) => {
        const [dr, dc] = DIRS[d];
        return !(dr === -player.d[0] && dc === -player.d[1]) && open(player.r + dr, player.c + dc);
      });
      if (ways.length === 1) {
        player.d = [...DIRS[ways[0]]] as Vec;
        player.face = ways[0];
      }
    }
    const [pdr, pdc] = player.d;
    if (open(player.r + pdr, player.c + pdc)) {
      player.r += pdr;
      player.c = wrap(player.c + pdc);
    }
    const it = items[player.r][player.c];
    if (it === 1) {
      items[player.r][player.c] = 0;
      left--;
      score += 10;
      burst(player.r, player.c, C.byte, 5);
      chomp(now);
    }
    if (it === 2) {
      items[player.r][player.c] = 0;
      score += 50;
      frightUntil = now + Math.max(6000, 8500 - level * 400);
      bugs.forEach((b) => (b.d = [-b.d[0], -b.d[1]]));
      burst(player.r, player.c, C.red, 14);
      beep(300, 0.25, "sawtooth", 0.05, 900);
    }
    if (it === 3) {
      items[player.r][player.c] = 0;
      score += 50;
      avUntil = now + Math.max(6500, 9000 - level * 400);
      viruses.forEach((v) => (v.d = [-v.d[0], -v.d[1]]));
      burst(player.r, player.c, C.virus, 16);
      say("Antivirus scan: viruses can be destroyed", C.virus);
      beep(400, 0.25, "triangle", 0.05, 1200);
    }
    if (bonus) {
      if (bonus.r === player.r && bonus.c === player.c) {
        const k = bonus.kind;
        bonus = null;
        applyPower(k, now);
      } else if (now > bonus.until) bonus = null;
    }
    const ratio = 1 - left / total;
    if (spawns < 2 && ratio >= (spawns === 0 ? 0.3 : 0.65)) {
      spawns++;
      spawnBonus(now);
    }

    const scared = now < frightUntil || now < fwUntil;
    bugs.forEach((b) => {
      b.pr = b.r;
      b.pc = b.c;
      if (frozen) return;
      if (b.delay > 0) {
        b.delay--;
        return;
      }
      // bugs never move at full speed: 2/3 of your speed up to level 4, then 3/4
      const skip = scared ? tick % 2 === 0 : level === 1 ? tick % 2 === 0 : tick % 3 === 0;
      if (skip) return;
      b.d = choose(b, scared ? -1 : 1, level <= 2 ? 0.4 : 0.5);
      b.r += b.d[0];
      b.c = wrap(b.c + b.d[1]);
    });
    viruses.forEach((v) => {
      v.pr = v.r;
      v.pc = v.c;
      if (frozen || tick % 4 !== 0) return;
      v.d = now < avUntil ? choose(v, -1, 0.8) : choose(v, 0, 0);
      v.r += v.d[0];
      v.c = wrap(v.c + v.d[1]);
    });

    if (ai)
      for (const b of bugs)
        if (b.delay === 0 && dist(b.r, b.c) <= 2) {
          zaps.push({ x1: player.c + 0.5, y1: player.r + 0.5, x2: b.c + 0.5, y2: b.r + 0.5, until: now + 260 });
          sendHome(b, 200);
          say("AI copilot zapped a bug +200", C.byte);
        }

    const hit = (e: Ent) =>
      (e.r === player.r && e.c === player.c) ||
      (e.r === player.pr && e.c === player.pc && e.pr === player.r && e.pc === player.c);
    for (let i = viruses.length - 1; i >= 0; i--) {
      if (!hit(viruses[i])) continue;
      if (fw || now < avUntil) {
        burst(viruses[i].r, viruses[i].c, C.virus, 22);
        viruses.splice(i, 1);
        score += 300;
        say("Virus quarantined +300", C.virus);
        beep(180, 0.2, "sawtooth", 0.05, 900);
      } else return die("virus", now);
    }
    for (const b of bugs) {
      if (!hit(b)) continue;
      if (scared) sendHome(b, fw ? 250 : 200);
      else return die("bug", now);
    }
    while (score >= nextLife) {
      nextLife += LIFE_EVERY;
      if (lives < MAX_LIVES) {
        lives++;
        say("Extra shield earned!", C.red);
        jingle([523, 659, 784]);
      }
    }
    saveBest();
    if (left === 0) {
      phase = level >= LEVELS ? "victory" : "won";
      jingle(level >= LEVELS ? [523, 659, 784, 1046, 784, 1046] : [660, 990]);
    }
    emit();
  }

  /* drawing */
  function buildWalls() {
    if (!cv.width || !walls.length) return;
    const tier = TIERS[tierFor(level)];
    wallLayer = document.createElement("canvas");
    wallLayer.width = cv.width;
    wallLayer.height = cv.height;
    const g = wallLayer.getContext("2d") as G;
    g.fillStyle = "rgba(140,150,180,.10)";
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        if (!walls[r][c]) g.fillRect((c + 0.5) * cs - dpr, (r + 0.5) * cs - dpr, 2 * dpr, 2 * dpr);
    const traces = (w: number, col: string, blur: number) => {
      g.save();
      g.strokeStyle = col;
      g.fillStyle = col;
      g.lineWidth = w;
      g.lineCap = "round";
      g.shadowColor = tier.hi;
      g.shadowBlur = blur;
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) {
          if (!walls[r][c]) continue;
          const x = (c + 0.5) * cs,
            y = (r + 0.5) * cs;
          g.beginPath();
          g.arc(x, y, w / 2, 0, Math.PI * 2);
          g.fill();
          if (c + 1 < N && walls[r][c + 1]) {
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + cs, y);
            g.stroke();
          }
          if (r + 1 < N && walls[r + 1][c]) {
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x, y + cs);
            g.stroke();
          }
        }
      g.restore();
    };
    traces(cs * 0.42, tier.base, 0);
    traces(cs * 0.16, tier.trace, cs * 0.5);
    g.fillStyle = "#0B1226";
    g.strokeStyle = tier.hi;
    g.lineWidth = 1.5 * dpr;
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        if (!walls[r][c]) continue;
        const k = [
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0],
        ].filter(([a, b]) => walls[r + a]?.[c + b]).length;
        if (k === 1 || k >= 3) {
          g.beginPath();
          g.arc((c + 0.5) * cs, (r + 0.5) * cs, cs * 0.12, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        }
      }
  }
  function drawPortals() {
    if (!wallLayer) return;
    const g = wallLayer.getContext("2d") as G;
    const tier = TIERS[tierFor(level)];
    const w = cs * 0.7;
    for (let r = 0; r < N; r++) {
      if (walls[r][0]) continue;
      for (const left of [true, false]) {
        const x0 = left ? 0 : wallLayer.width - w;
        const gr = g.createLinearGradient(left ? 0 : wallLayer.width, 0, left ? w : wallLayer.width - w, 0);
        gr.addColorStop(0, tier.hi + "99");
        gr.addColorStop(1, tier.hi + "00");
        g.fillStyle = gr;
        g.fillRect(x0, r * cs + cs * 0.12, w, cs * 0.76);
        g.strokeStyle = tier.hi;
        g.lineWidth = 1.5 * dpr;
        g.beginPath();
        const ax = left ? cs * 0.28 : wallLayer.width - cs * 0.28;
        const k = left ? -1 : 1;
        g.moveTo(ax - k * cs * 0.08, (r + 0.5) * cs - cs * 0.12);
        g.lineTo(ax + k * cs * 0.06, (r + 0.5) * cs);
        g.lineTo(ax - k * cs * 0.08, (r + 0.5) * cs + cs * 0.12);
        g.stroke();
      }
    }
  }
  function resize() {
    const rect = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(rect.width * dpr));
    cv.height = Math.max(1, Math.round(rect.height * dpr));
    cs = cv.width / N;
    buildWalls();
    drawPortals();
  }
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  // through a side tunnel the sprite slides in from the board edge instead of across the board
  const pos = (e: Ent, t: number): [number, number] => {
    const from = Math.abs(e.c - e.pc) > 1 ? e.c - e.d[1] : e.pc;
    return [lerp(from, e.c, t) + 0.5, lerp(e.pr, e.r, t) + 0.5];
  };

  function render(now: number, t: number) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#060912";
    ctx.fillRect(0, 0, cv.width, cv.height);
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake * dpr, (Math.random() - 0.5) * shake * dpr);
      shake *= 0.85;
      if (shake < 0.4) shake = 0;
    }
    if (wallLayer) ctx.drawImage(wallLayer, 0, 0);
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        if (items[r][c] === 1) drawByte(ctx, (c + 0.5) * cs, (r + 0.5) * cs, cs);
        else if (items[r][c] === 2) drawPatch(ctx, (c + 0.5) * cs, (r + 0.5) * cs, cs, now);
        else if (items[r][c] === 3) drawAntivirus(ctx, (c + 0.5) * cs, (r + 0.5) * cs, cs, now);
      }
    if (bonus && !(bonus.until - now < 2500 && Math.floor(now / 150) % 2)) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(now / 200);
      ctx.fillStyle = C.gold;
      ctx.beginPath();
      ctx.arc((bonus.c + 0.5) * cs, (bonus.r + 0.5) * cs, cs * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawPower(ctx, bonus.kind, (bonus.c + 0.5) * cs, (bonus.r + 0.5) * cs, cs, now);
    }
    const frozen = now < idsUntil && phase !== "ready";
    const ring = (x: number, y: number) => {
      ctx.save();
      ctx.strokeStyle = C.ids;
      ctx.lineWidth = 1.5 * dpr;
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.beginPath();
      ctx.arc(x, y, cs * 0.46, now / 400, now / 400 + Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    const weak = now < avUntil;
    const weakFlash = weak && avUntil - now < 1600 && Math.floor(now / 160) % 2 === 0;
    viruses.forEach((v) => {
      const [x, y] = pos(v, t);
      drawVirus(ctx, x * cs, y * cs, cs, frozen ? 0 : now, v.spin, weak, weakFlash);
      if (frozen) ring(x * cs, y * cs);
    });
    const fright = now < frightUntil || now < fwUntil;
    const endAt = Math.max(frightUntil, fwUntil);
    const flash = fright && endAt - now < 1600 && Math.floor(now / 160) % 2 === 0;
    bugs.forEach((b) => {
      const [x, y] = pos(b, t);
      drawBug(ctx, x * cs, y * cs, cs, b.d, frozen ? 0 : now, fright, flash);
      if (frozen) ring(x * cs, y * cs);
    });
    if (target && phase === "playing") {
      const k = 0.3 + 0.12 * Math.sin(now / 150);
      ctx.save();
      ctx.strokeStyle = C.red;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc((target.c + 0.5) * cs, (target.r + 0.5) * cs, cs * k, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const [px, py] = pos(player, t);
    if (now < idsUntil) {
      const k = (now % 1200) / 1200;
      ctx.save();
      ctx.strokeStyle = `rgba(180,140,255,${0.5 * (1 - k)})`;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(px * cs, py * cs, cs * (0.6 + k * 4), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (phase !== "over" && !(phase === "dying" && Math.floor(now / 100) % 2)) {
      const moving = (player.r !== player.pr || player.c !== player.pc) && phase === "playing";
      drawPlayer(
        ctx,
        px * cs,
        py * cs,
        cs,
        player.face,
        moving ? Math.abs(Math.sin(now / 70)) : 0.35,
        RANK_EMBLEM[level - 1],
        now < fwUntil,
        now
      );
      if (now < aiUntil) {
        const a = now / 280;
        drawDrone(ctx, (px + Math.cos(a) * 0.85) * cs, (py + Math.sin(a) * 0.85) * cs, cs * 0.75, now);
      }
    }
    zaps = zaps.filter((z) => z.until > now);
    zaps.forEach((z) => {
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.shadowColor = C.byte;
      ctx.shadowBlur = 12 * dpr;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(z.x1 * cs, z.y1 * cs);
      for (let i = 1; i < 6; i++) {
        const k = i / 6;
        ctx.lineTo(
          lerp(z.x1, z.x2, k) * cs + (Math.random() - 0.5) * cs * 0.3,
          lerp(z.y1, z.y2, k) * cs + (Math.random() - 0.5) * cs * 0.3
        );
      }
      ctx.lineTo(z.x2 * cs, z.y2 * cs);
      ctx.stroke();
      ctx.restore();
    });
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= 0.03;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x * cs - 1.5 * dpr, p.y * cs - 1.5 * dpr, 3 * dpr, 3 * dpr);
    });
    ctx.globalAlpha = 1;
    particles = particles.filter((p) => p.life > 0);
  }
  function loop(now: number) {
    clock = now;
    const dt = Math.min(100, now - (last || now));
    last = now;
    if (phase === "playing") {
      acc += dt;
      while (acc >= tickMs && phase === "playing") {
        acc -= tickMs;
        step(now);
      }
    }
    if (phase === "dying" && now - deathAt > 1100) {
      placeActors();
      phase = "playing";
      acc = 0;
      emit();
    }
    render(now, phase === "playing" ? Math.min(1, acc / tickMs) : 1);
    raf = requestAnimationFrame(loop);
  }

  /* controls */
  function input(d: Dir) {
    ensureAudio();
    if (phase === "ready") {
      phase = "playing";
      emit();
    }
    if (phase === "playing") {
      want = d;
      target = null;
    }
  }
  function togglePause() {
    if (phase === "playing") phase = "paused";
    else if (phase === "paused") phase = "playing";
    emit();
  }
  function advance() {
    ensureAudio();
    if (phase === "ready") {
      phase = "playing";
      emit();
    } else if (phase === "paused") togglePause();
    else if (phase === "won") {
      level++;
      parse();
      placeActors();
      setSpeed();
      phase = "ready";
      emit();
    } else newGame();
  }
  const keyMap: Record<string, Dir> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
    W: "up",
    S: "down",
    A: "left",
    D: "right",
  };
  function onKey(e: KeyboardEvent) {
    const tgt = e.target as HTMLElement | null;
    if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA")) return;
    const k = keyMap[e.key];
    if (k) {
      e.preventDefault();
      input(k);
      return;
    }
    if (e.key === "p" || e.key === "P" || e.key === " ") {
      e.preventDefault();
      togglePause();
    }
  }
  // swipe reacts while the finger is still moving (no need to lift it), and keeps steering as you drag
  let sx = 0,
    sy = 0,
    swiping = false,
    swiped = false;
  const onDown = (e: PointerEvent) => {
    swiping = true;
    swiped = false;
    sx = e.clientX;
    sy = e.clientY;
    try {
      cv.setPointerCapture(e.pointerId);
    } catch {}
  };
  const onMove = (e: PointerEvent) => {
    if (!swiping) return;
    const dx = e.clientX - sx,
      dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) return;
    input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    swiped = true;
    sx = e.clientX;
    sy = e.clientY;
  };
  const onUp = (e: PointerEvent) => {
    if (swiping && !swiped && e.type === "pointerup") tapAt(e.clientX, e.clientY);
    swiping = false;
  };

  window.addEventListener("keydown", onKey);
  cv.addEventListener("pointerdown", onDown);
  cv.addEventListener("pointermove", onMove);
  cv.addEventListener("pointerup", onUp);
  cv.addEventListener("pointercancel", onUp);
  const ro = new ResizeObserver(resize);
  ro.observe(cv);
  resize();
  newGame();
  raf = requestAnimationFrame(loop);

  return {
    input,
    advance,
    togglePause,
    restart: newGame,
    testLevel(n: number) {
      ensureAudio();
      level = Math.min(LEVELS, Math.max(1, n));
      parse();
      placeActors();
      setSpeed();
      phase = "ready";
      emit();
    },
    testWin() {
      ensureAudio();
      level = LEVELS;
      parse();
      placeActors();
      score = Math.max(score, 4820);
      saveBest();
      phase = "victory";
      jingle([523, 659, 784, 1046, 784, 1046]);
      emit();
    },
    setSound(on: boolean) {
      sound = on;
    },
    destroy() {
      cancelAnimationFrame(raf);
      timers.forEach((t) => clearTimeout(t));
      window.removeEventListener("keydown", onKey);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      ro.disconnect();
      actx?.close().catch(() => {});
    },
  };
}
type Game = ReturnType<typeof createGame>;

/* ================= leaderboard ================= */
type Row = { name: string; score: number; level: number };
type Board = { mode: "global" | "local" | "loading"; rows: Row[] };
const LOCAL_KEY = "bm-scores";
function readLocal(): Row[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeLocal(rows: Row[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  } catch {}
}

function useLeaderboard() {
  const [board, setBoard] = useState<Board>({ mode: "loading", rows: [] });
  useEffect(() => {
    let alive = true;
    fetch("/api/scores", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { scores: Row[] }) => alive && setBoard({ mode: "global", rows: j.scores }))
      .catch(() => alive && setBoard({ mode: "local", rows: readLocal() }));
    return () => {
      alive = false;
    };
  }, []);
  const submit = useCallback(
    async (entry: Row): Promise<number> => {
      const rankOf = (rows: Row[]) =>
        rows.findIndex((r) => r.name === entry.name && r.score === entry.score) + 1;
      if (board.mode === "global" && !TEST_MODE) {
        try {
          const r = await fetch("/api/scores", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(entry),
          });
          if (r.ok) {
            const j: { scores: Row[] } = await r.json();
            setBoard({ mode: "global", rows: j.scores });
            return rankOf(j.scores);
          }
        } catch {}
      }
      const rows = [...readLocal(), entry].sort((a, b) => b.score - a.score).slice(0, 10);
      writeLocal(rows);
      setBoard({ mode: "local", rows });
      return rankOf(rows);
    },
    [board.mode]
  );
  return { board, submit };
}

function NameEntry({ score, level, submit }: { score: number; level: number; submit: (r: Row) => Promise<number> }) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("bm-name") || "";
    } catch {
      return "";
    }
  });
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [place, setPlace] = useState(0);
  if (score <= 0) return null;
  if (state === "done")
    return (
      <p className="text-sm" style={{ color: C.byte }}>
        {place > 0 ? `Saved. You are #${place} in the Top defenders.` : "Saved."}
      </p>
    );
  return (
    <form
      className="flex w-full max-w-xs flex-wrap items-center justify-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const clean = name.trim().slice(0, 14);
        if (!clean) return;
        setState("saving");
        try {
          localStorage.setItem("bm-name", clean);
        } catch {}
        setPlace(await submit({ name: clean, score, level }));
        setState("done");
      }}
    >
      <label htmlFor="bm-name" className="sr-only">
        Your name
      </label>
      <input
        id="bm-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={14}
        placeholder="Your name"
        autoComplete="nickname"
        className="min-w-0 flex-1 rounded-md px-3 py-2 text-[15px] outline-none focus:ring-2"
        style={{ background: "#0B0F1E", border: "1px solid #2A3354", color: C.fg }}
      />
      <button
        type="submit"
        disabled={state === "saving" || !name.trim()}
        className="rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider disabled:opacity-50"
        style={{ boxShadow: "inset 0 0 0 1px #2A3354", color: C.fg }}
      >
        {state === "saving" ? "Saving…" : "Save score"}
      </button>
    </form>
  );
}

/* ================= AVA ================= */
function Ava({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 230" className={className} role="img" aria-label="AVA, the AvaByteGuard mascot, smiling and waving">
      <defs>
        <radialGradient id="avaGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="rgba(230,57,70,.35)" />
          <stop offset="1" stopColor="rgba(230,57,70,0)" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="105" r="100" fill="url(#avaGlow)" />
      {/* hair back */}
      <path d="M44 104 Q38 34 100 30 Q162 34 156 104 L160 160 Q146 172 132 156 L68 156 Q54 172 40 160 Z" fill="#2A1A2E" />
      {/* body */}
      <path d="M28 230 Q32 168 100 158 Q168 168 172 230 Z" fill="#10152A" stroke="#2A3354" strokeWidth="2" />
      <path d="M78 160 L100 186 L122 160" fill="none" stroke="#E63946" strokeWidth="4" strokeLinejoin="round" />
      <path
        d="M100 192 q14 3 14 7 q0 16 -14 24 q-14 -8 -14 -24 q0 -4 14 -7 Z"
        fill="#E63946"
      />
      <path d="M94 206 l5 5 l9 -10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* waving arm */}
      <path d="M160 200 Q178 170 172 140" fill="none" stroke="#10152A" strokeWidth="18" strokeLinecap="round" />
      <circle cx="172" cy="134" r="11" fill="#F2C29C" />
      {/* neck + face */}
      <rect x="88" y="134" width="24" height="26" rx="9" fill="#E3AE88" />
      <ellipse cx="100" cy="98" rx="47" ry="51" fill="#F2C29C" />
      {/* bangs with red streak */}
      <path d="M52 94 Q52 42 100 40 Q150 42 150 96 Q132 72 112 64 Q92 82 52 94 Z" fill="#2A1A2E" />
      <path d="M112 64 Q128 70 142 84 Q134 58 112 48 Z" fill="#E63946" />
      {/* brows */}
      <path d="M70 84 Q80 78 90 83" fill="none" stroke="#2A1A2E" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M110 83 Q120 78 130 84" fill="none" stroke="#2A1A2E" strokeWidth="3.5" strokeLinecap="round" />
      {/* eyes */}
      <ellipse cx="80" cy="99" rx="9" ry="11" fill="#fff" />
      <ellipse cx="120" cy="99" rx="9" ry="11" fill="#fff" />
      <circle cx="81" cy="101" r="6" fill="#2B1B3A" />
      <circle cx="121" cy="101" r="6" fill="#2B1B3A" />
      <circle cx="83" cy="98" r="2" fill="#fff" />
      <circle cx="123" cy="98" r="2" fill="#fff" />
      {/* cheeks + smile */}
      <ellipse cx="68" cy="116" rx="7" ry="4" fill="#F28B8B" opacity=".55" />
      <ellipse cx="132" cy="116" rx="7" ry="4" fill="#F28B8B" opacity=".55" />
      <path d="M84 120 Q100 136 116 120 Q100 128 84 120 Z" fill="#9B2335" />
      {/* headset */}
      <path d="M50 98 Q50 36 100 34 Q150 36 150 98" fill="none" stroke="#5B86D9" strokeWidth="6" />
      <rect x="42" y="88" width="14" height="26" rx="6" fill="#5B86D9" />
      <rect x="144" y="88" width="14" height="26" rx="6" fill="#5B86D9" />
      <path d="M50 112 Q56 132 80 132" fill="none" stroke="#5B86D9" strokeWidth="3" />
      <circle cx="82" cy="132" r="4" fill="#E63946" />
      {/* sparkles */}
      <path d="M28 52 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" fill="#FFD166" />
      <path d="M170 60 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#7FE7F0" />
    </svg>
  );
}

/* ================= UI bits ================= */
type LegendKind = "player" | "byte" | "patch" | "antivirus" | "bug" | "virus" | Power;
function LegendIcon({ kind, dim = false }: { kind: LegendKind; dim?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const s = c.width;
    g.clearRect(0, 0, s, s);
    if (kind === "player") drawPlayer(g, s / 2, s / 2, s * 0.9, "right", 0.6, "rgba(255,255,255,.2)", false, 0);
    else if (kind === "byte") drawByte(g, s / 2, s / 2, s * 1.6);
    else if (kind === "patch") drawPatch(g, s / 2, s / 2, s * 0.95, 0);
    else if (kind === "antivirus") drawAntivirus(g, s / 2, s / 2, s * 0.95, 0);
    else if (kind === "bug") drawBug(g, s / 2, s / 2, s * 0.95, [0, 1], 0, false, false);
    else if (kind === "virus") drawVirus(g, s / 2, s / 2, s * 0.95, 0, 0);
    else drawPower(g, kind, s / 2, s / 2, s * 0.95, 0);
  }, [kind]);
  return (
    <canvas
      ref={ref}
      width={80}
      height={80}
      className="h-9 w-9 shrink-0 rounded-md"
      style={{ background: "#0B0F1E", border: `1px solid ${C.line}`, opacity: dim ? 0.35 : 1 }}
    />
  );
}

const BASICS: { kind: LegendKind; title: string; text: string }[] = [
  { kind: "byte", title: "Byte · +10", text: "Collect them all to clear the level." },
  { kind: "patch", title: "Security patch · +50", text: "Red bandage. Bugs become fixable for a few seconds (+200 each). It does not add shields." },
  { kind: "antivirus", title: "Antivirus · +50", text: "Viruses turn grey and can be destroyed for a few seconds (+300 each)." },
  { kind: "bug", title: "Bug", text: "Hunts you. Costs one shield." },
  { kind: "virus", title: "Virus", text: "Costs one shield, unless it is grey. Then you can destroy it." },
];

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-[72px] flex-col rounded-md px-3 py-1.5" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <small className="text-[11px] uppercase tracking-[0.14em]" style={{ color: C.muted }}>
        {label}
      </small>
      {children}
    </div>
  );
}
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className={`${mono.className} rounded border border-b-2 px-1.5 text-xs`} style={{ background: "#1A2140", borderColor: "#2A3354" }}>
      {children}
    </kbd>
  );
}
const MEDALS = [C.gold, "#C9D1E0", "#D08C5B"];
function Leaderboard({ board, highlight, limit = 10 }: { board: Board; highlight?: string; limit?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={`${display.className} text-sm tracking-widest`} style={{ color: C.muted }}>
          TOP DEFENDERS
        </h3>
        <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: C.muted }}>
          {board.mode === "global" ? "Worldwide" : board.mode === "local" ? "On this device" : ""}
        </span>
      </div>
      {board.mode === "loading" ? (
        <p className="text-[13px]" style={{ color: C.muted }}>
          Loading scores…
        </p>
      ) : board.rows.length === 0 ? (
        <p className="text-[13px]" style={{ color: C.muted }}>
          No scores yet. Finish a run and save your name to claim the top spot.
        </p>
      ) : (
        <ol className={`${mono.className} flex flex-col text-[13px] tabular-nums`}>
          {board.rows.slice(0, limit).map((r, i) => (
            <li
              key={`${r.name}-${r.score}-${i}`}
              className="grid grid-cols-[22px_minmax(0,1fr)_auto_auto] items-center gap-2 border-b py-1"
              style={{ borderColor: C.line, color: r.name === highlight ? C.gold : C.fg }}
            >
              <span className="font-bold" style={{ color: MEDALS[i] ?? C.muted }}>{i + 1}</span>
              <span className={`${body.className} truncate text-[14px]`}>{r.name}</span>
              <span title={RANKS[Math.min(LEVELS, Math.max(1, r.level)) - 1]} style={{ color: C.muted }}>
                L{r.level}
              </span>
              <span className="min-w-[56px] text-right">{r.score.toLocaleString("en-US")}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ================= modal ================= */
function GameModal({
  onClose,
  board,
  submit,
}: {
  onClose: () => void;
  board: Board;
  submit: (r: Row) => Promise<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<Hud>({
    score: 0,
    best: 0,
    level: 1,
    lives: 4,
    phase: "ready",
    reason: "",
    total: 0,
    toast: null,
    effects: [],
    runId: 0,
  });
  const [sound, setSound] = useState(true);
  const [me, setMe] = useState<string | undefined>();

  useEffect(() => {
    if (!canvasRef.current) return;
    const g = createGame(canvasRef.current, setHud);
    gameRef.current = g;
    return () => {
      g.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const save = useCallback(
    async (r: Row) => {
      setMe(r.name);
      return submit(r);
    },
    [submit]
  );

  const numCls = `${mono.className} text-xl font-bold tabular-nums leading-tight`;
  const { phase, level } = hud;
  const unlock = UNLOCK[level];
  const nextUnlock = UNLOCK[level + 1];
  const ranked = board.mode !== "loading" && board.rows.length > 0;
  const place = board.rows.filter((r) => r.score >= hud.score).length + 1;
  const toBeat = [...board.rows].filter((r) => r.score >= hud.score).sort((a, b) => a.score - b.score)[0];
  const tier = TIERS[tierFor(level)];

  let overlay: { title: string; lines: string[]; cta: string; tone: string; entry?: boolean } | null = null;
  if (phase === "ready")
    overlay = {
      title: `Level ${level} of ${LEVELS}`,
      lines: [
        `${tier.name} · Rank: ${RANKS[level - 1]}`,
        unlock
          ? `New surprise unlocked: ${POWERS[unlock].name}. ${POWERS[unlock].desc}`
          : level === 1
          ? "Clear the network. Grab a green-and-white capsule to destroy the virus, or use the side tunnels to escape."
          : "Press an arrow key or swipe to start.",
      ],
      cta: "Start",
      tone: C.fg,
    };
  if (phase === "paused") overlay = { title: "Paused", lines: ["Press P to resume."], cta: "Resume", tone: C.fg };
  if (phase === "won")
    overlay = {
      title: `Level ${level} of ${LEVELS} cleared`,
      lines: [
        `Score ${hud.score.toLocaleString("en-US")}`,
        nextUnlock ? `Next level unlocks: ${POWERS[nextUnlock].name}` : `Next: level ${level + 1}`,
      ],
      cta: "Next level",
      tone: C.byte,
    };
  if (phase === "over")
    overlay = {
      title: hud.reason,
      lines: [
        hud.reason === "System infected" ? "A virus took your last shield." : "You ran out of shields.",
        `Score ${hud.score.toLocaleString("en-US")} · reached level ${level} of ${LEVELS}`,
        ...(hud.score > 0 && place <= 10 ? [`That puts you #${place} in the Top defenders. Save your name!`] : []),
      ],
      cta: "Play again",
      tone: C.red,
      entry: true,
    };

  return (
    <div
      className={`${body.className} fixed inset-0 z-50 overflow-y-auto`}
      style={{
        color: C.fg,
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(230,57,70,.16), transparent 60%), ${C.ink}`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Patch-Man"
    >
      <style>{`@keyframes bmToast{0%{opacity:0;transform:translateY(6px)}10%,75%{opacity:1;transform:none}100%{opacity:0}}.bm-toast{animation:bmToast 2.4s ease forwards}@keyframes bmPop{0%{transform:scale(1)}30%{transform:scale(1.25)}100%{transform:scale(1)}}.bm-pop{animation:bmPop .5s ease}.bm-board{width:min(100%,600px,66vh)}@media (pointer:coarse){.bm-board{width:min(100%,64vh)}}@media (prefers-reduced-motion:reduce){.bm-toast{animation:none}}`}</style>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em]" style={{ color: C.muted }}>
              Arcade · Rank: <span style={{ color: RANK_EMBLEM[level - 1].startsWith("rgba") ? C.fg : RANK_EMBLEM[level - 1] }}>{RANKS[level - 1]}</span>
            </div>
            <h2 className={`${display.className} text-4xl leading-none font-bold sm:text-5xl`}>
              <span className="whitespace-nowrap">
                Patch<span style={{ color: C.red, textShadow: "0 0 18px rgba(230,57,70,.55)" }}>-Man</span>
              </span>
            </h2>
            <div className="mt-1 text-[13px] tracking-wide" style={{ color: C.muted }}>
              by AvaByteGuard
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Stat label="Score">
              <b className={numCls}>{hud.score.toLocaleString("en-US")}</b>
            </Stat>
            <Stat label="Best">
              <b className={numCls}>{hud.best.toLocaleString("en-US")}</b>
            </Stat>
            <Stat label="Level">
              <b className={numCls}>
                {level}
                <span className="text-sm font-medium" style={{ color: C.muted }}>
                  {" "}
                  of {LEVELS}
                </span>
              </b>
            </Stat>
            <Stat label="Shields">
              <div key={hud.lives} className="bm-pop flex h-7 items-center gap-1">
                {Array.from({ length: MAX_LIVES }).map((_, i) => (
                  <i
                    key={i}
                    className="block h-[18px] w-4"
                    style={{
                      background: i < hud.lives ? C.red : "#2A3150",
                      opacity: i >= 3 && i >= hud.lives ? 0.35 : 1,
                      clipPath: "polygon(50% 0,100% 18%,100% 55%,50% 100%,0 55%,0 18%)",
                    }}
                  />
                ))}
              </div>
            </Stat>
            <button
              onClick={onClose}
              className="ml-1 self-stretch rounded-md px-4 font-semibold hover:brightness-125"
              style={{ background: "#1A2140", boxShadow: "inset 0 0 0 1px #2A3354" }}
            >
              ✕ Close
            </button>
          </div>
        </header>

        {TEST_MODE && (
          <div
            className="flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-[13px]"
            style={{ background: "rgba(255,209,102,.08)", boxShadow: `inset 0 0 0 1px ${C.gold}55`, color: C.gold }}
          >
            <b className="mr-1 uppercase tracking-wider">Test mode</b>
            <span style={{ color: C.muted }}>Only visible to you. Scores saved here stay on this device.</span>
            <span className="flex flex-wrap gap-2 sm:ml-auto">
              <button
                onClick={() => gameRef.current?.testLevel(LEVELS)}
                className="rounded px-3 py-1 font-semibold"
                style={{ boxShadow: `inset 0 0 0 1px ${C.gold}88` }}
              >
                Play level {LEVELS}
              </button>
              <button
                onClick={() => gameRef.current?.testWin()}
                className="rounded px-3 py-1 font-semibold"
                style={{ background: C.gold, color: "#141A30" }}
              >
                Show winning screen
              </button>
            </span>
          </div>
        )}

        {/* level progress */}
        <div className="flex gap-1" aria-label={`Level ${level} of ${LEVELS}`}>
          {Array.from({ length: LEVELS }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{
                background: i < level - 1 ? C.red : i === level - 1 ? C.gold : "#1F2746",
                boxShadow: i === level - 1 ? `0 0 10px ${C.gold}` : "none",
              }}
            />
          ))}
        </div>

        {ranked && (
          <p className="-mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]" style={{ color: C.muted }}>
            <span>
              Live ranking:{" "}
              <b className={`${mono.className} tabular-nums`} style={{ color: place <= 3 ? MEDALS[place - 1] : C.fg }}>
                #{place}
              </b>
            </span>
            <span>
              {toBeat ? (
                <>
                  Next to beat: <b style={{ color: C.fg }}>{toBeat.name}</b>{" "}
                  <span className={`${mono.className} tabular-nums`}>
                    {toBeat.score.toLocaleString("en-US")} (+{(toBeat.score - hud.score + 1).toLocaleString("en-US")})
                  </span>
                </>
              ) : (
                <b style={{ color: C.gold }}>You lead the board!</b>
              )}
            </span>
          </p>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section
            className="flex min-w-0 flex-col gap-3 rounded-2xl p-3 sm:p-4"
            style={{ background: C.panel, border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(230,57,70,.25)" }}
          >
            <div className="bm-board relative mx-auto aspect-square overflow-hidden rounded-lg" style={{ background: "#060912" }}>
              <canvas ref={canvasRef} className="block h-full w-full touch-none select-none" aria-label="Patch-Man game board" />
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "repeating-linear-gradient(to bottom, rgba(255,255,255,.025) 0 1px, transparent 1px 3px)" }}
              />
              {/* active effects */}
              {hud.effects.length > 0 && (
                <div className="pointer-events-none absolute top-2 left-2 z-10 flex flex-wrap gap-1.5">
                  {hud.effects.map((e) => (
                    <span
                      key={e.label}
                      className={`${mono.className} rounded px-2 py-0.5 text-[11px] font-bold tabular-nums`}
                      style={{ background: "rgba(6,9,18,.8)", color: e.color, boxShadow: `inset 0 0 0 1px ${e.color}` }}
                    >
                      {e.label} {e.secs}s
                    </span>
                  ))}
                </div>
              )}
              {hud.toast && phase !== "over" && phase !== "victory" && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
                  <span
                    key={hud.toast.id}
                    className="bm-toast rounded-md px-3 py-1.5 text-sm font-semibold"
                    style={{ background: "rgba(6,9,18,.85)", color: hud.toast.color, boxShadow: `inset 0 0 0 1px ${hud.toast.color}55` }}
                  >
                    {hud.toast.text}
                  </span>
                </div>
              )}
              {overlay && (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-5 text-center backdrop-blur-[2px]"
                  style={{ background: "rgba(6,9,18,.82)" }}
                >
                  <h3
                    className={`${display.className} text-2xl text-balance sm:text-3xl`}
                    style={{ color: overlay.tone, textShadow: `0 0 16px ${overlay.tone}88` }}
                  >
                    {overlay.title}
                  </h3>
                  {overlay.lines.map((l) => (
                    <p key={l} className="max-w-[36ch] text-[15px]" style={{ color: C.muted }}>
                      {l}
                    </p>
                  ))}
                  {phase === "ready" && unlock && (
                    <div className="flex items-center gap-2">
                      <LegendIcon kind={unlock} />
                    </div>
                  )}
                  {overlay.entry && <NameEntry key={hud.runId} score={hud.score} level={level} submit={save} />}
                  <button
                    onClick={() => gameRef.current?.advance()}
                    className="rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider text-white hover:brightness-110"
                    style={{ background: C.red, boxShadow: "0 6px 20px -6px rgba(230,57,70,.7)" }}
                  >
                    {overlay.cta}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px]" style={{ color: C.muted }}>
                Move <Kbd>←</Kbd> <Kbd>↑</Kbd> <Kbd>→</Kbd> <Kbd>↓</Kbd> or <Kbd>WASD</Kbd> · Pause <Kbd>P</Kbd> · Or click a spot on the board
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const on = !sound;
                    setSound(on);
                    gameRef.current?.setSound(on);
                  }}
                  aria-pressed={sound}
                  className="rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider hover:brightness-125"
                  style={{ boxShadow: "inset 0 0 0 1px #2A3354" }}
                >
                  {sound ? "Sound on" : "Sound off"}
                </button>
                <button
                  onClick={() => gameRef.current?.restart()}
                  className="rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:brightness-110"
                  style={{ background: C.red }}
                >
                  Restart
                </button>
              </div>
            </div>

            <div className="hidden flex-col items-center gap-2 pointer-coarse:flex">
              <p className="text-center text-[13px]" style={{ color: C.fg }}>
                <b>Tap the board</b> where you want to go. Swipe to change direction fast.
              </p>
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-5">
            <Leaderboard board={board} highlight={me} />

            <div className="flex flex-col gap-2">
              <h3 className={`${display.className} text-sm tracking-widest`} style={{ color: C.muted }}>
                SURPRISES
              </h3>
              <ul className="flex flex-col gap-2">
                {(Object.keys(POWERS) as Power[]).map((k) => {
                  const locked = POWERS[k].from > level;
                  return (
                    <li key={k} className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-3">
                      <LegendIcon kind={k} dim={locked} />
                      <div className="min-w-0">
                        <b className="block text-[14px] font-semibold" style={{ color: locked ? C.muted : C.fg }}>
                          {POWERS[k].name}
                          {locked && (
                            <span className="ml-1.5 text-[11px] font-medium uppercase tracking-wider">· level {POWERS[k].from}</span>
                          )}
                        </b>
                        <span className="text-[13px]" style={{ color: C.muted }}>
                          {POWERS[k].desc}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[13px]" style={{ color: C.muted }}>
                Extra shield every {LIFE_EVERY.toLocaleString("en-US")} points (up to {MAX_LIVES}).
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className={`${display.className} text-sm tracking-widest`} style={{ color: C.muted }}>
                FIELD GUIDE
              </h3>
              <ul className="flex flex-col gap-2">
                {BASICS.map((l) => (
                  <li key={l.title} className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-3">
                    <LegendIcon kind={l.kind} />
                    <div className="min-w-0">
                      <b className="block text-[14px] font-semibold">{l.title}</b>
                      <span className="text-[13px]" style={{ color: C.muted }}>
                        {l.text}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[13px]" style={{ color: C.muted }}>
                Side tunnels: run off one edge of the board and reappear on the other side. Only you can use them, so they are your escape route.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {phase === "victory" && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4"
          style={{ background: `radial-gradient(900px 500px at 50% 30%, rgba(255,209,102,.18), transparent 65%), rgba(6,9,18,.94)` }}
        >
          <div className="flex w-full max-w-2xl flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
            <Ava className="h-auto w-48 shrink-0 sm:w-60" />
            <div className="flex min-w-0 flex-col items-center gap-3 sm:items-start">
              <div
                className="relative rounded-2xl px-5 py-4"
                style={{ background: C.fg, color: "#141A30", boxShadow: "0 20px 60px -20px rgba(255,209,102,.6)" }}
              >
                <p className={`${display.className} text-xl leading-snug sm:text-2xl`}>You are a true cybersecurity defender!</p>
                <p className="mt-1 text-sm font-semibold">— Ava ByteGuard</p>
                <span
                  className="absolute hidden h-4 w-4 rotate-45 sm:block"
                  style={{ background: C.fg, left: -7, bottom: 26 }}
                  aria-hidden="true"
                />
              </div>
              <p className="text-[15px]" style={{ color: C.muted }}>
                All {LEVELS} levels cleared · Rank: <span style={{ color: C.gold }}>CISO</span> · Score{" "}
                <b className={`${mono.className} tabular-nums`} style={{ color: C.fg }}>
                  {hud.score.toLocaleString("en-US")}
                </b>
              </p>
              <NameEntry key={`v${hud.runId}`} score={hud.score} level={LEVELS} submit={save} />
              <div className="flex gap-2">
                <button
                  onClick={() => gameRef.current?.advance()}
                  className="rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider text-white"
                  style={{ background: C.red }}
                >
                  Play again
                </button>
                <button
                  onClick={onClose}
                  className="rounded-md px-5 py-2.5 font-semibold uppercase tracking-wider"
                  style={{ boxShadow: "inset 0 0 0 1px #2A3354" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= section on the home page ================= */
export default function ByteMuncher() {
  const [gameOpen, setGameOpen] = useState(false);
  const { board, submit } = useLeaderboard();
  const leader = board.rows[0];
  const close = useCallback(() => setGameOpen(false), []);

  useEffect(() => {
    document.body.style.overflow = gameOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [gameOpen]);

  return (
    <section className="bg-black px-8 py-16 text-white">
      <div
        className={`${body.className} relative overflow-hidden rounded-2xl p-6 sm:p-8`}
        style={{
          background: `radial-gradient(600px 300px at 90% 0%, rgba(230,57,70,.18), transparent 70%), ${C.panel}`,
          border: `1px solid ${C.line}`,
          boxShadow: "0 30px 80px -40px rgba(230,57,70,.45)",
        }}
      >
        <div className="text-xs uppercase tracking-[0.18em]" style={{ color: C.muted }}>
          Cybersecurity arcade · {LEVELS} levels
        </div>
        <h2 className={`${display.className} mt-1 text-3xl font-bold sm:text-4xl`}>
          <span className="whitespace-nowrap">
            Patch<span style={{ color: C.red, textShadow: "0 0 18px rgba(230,57,70,.55)" }}>-Man</span>
          </span>
        </h2>
        <div className="mb-3 text-[13px] tracking-wide" style={{ color: C.muted }}>
          by AvaByteGuard
        </div>
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <p className="mb-4 max-w-[60ch] text-gray-300">
              A mini cybersecurity arcade game. Collect bytes, avoid bugs, and do not touch the viruses. Unlock backups, IDS
              radar, firewalls and an AI copilot on your way to CISO.
            </p>
            <p className="mb-6 text-[15px]" style={{ color: C.fg }}>
              {leader ? (
                <>
                  Can you beat <b style={{ color: C.gold }}>{leader.name}</b>&apos;s{" "}
                  <b className={`${mono.className} tabular-nums`}>{leader.score.toLocaleString("en-US")}</b> points?
                </>
              ) : (
                "Be the first name on the Top defenders board."
              )}
            </p>
            <button
              onClick={() => setGameOpen(true)}
              className="rounded-md px-6 py-3 font-semibold uppercase tracking-wider text-white hover:brightness-110"
              style={{ background: C.red, boxShadow: "0 6px 20px -6px rgba(230,57,70,.7)" }}
            >
              Open Game
            </button>
          </div>
          <div className="min-w-0 rounded-xl p-4" style={{ background: "rgba(6,9,18,.6)", border: `1px solid ${C.line}` }}>
            <Leaderboard board={board} limit={5} />
          </div>
        </div>
      </div>

      {gameOpen && <GameModal onClose={close} board={board} submit={submit} />}
    </section>
  );
}
