// Full-width banner for the Who's Knocking? AI readiness check.
// The night scene fills the whole card; the door stays pinned to the right edge at every width.

const W = 1200;
const H = 360;
const GROUND = 300;

// Deterministic star field so server and client render the same markup.
const stars = Array.from({ length: 70 }, (_, i) => {
  const x = (i * 173 + 37) % W;
  const y = ((i * 97 + 11) % 210) + 8;
  const r = i % 5 === 0 ? 1.6 : i % 2 === 0 ? 1.1 : 0.8;
  return { x, y, r, delay: (i % 7) * 0.45 };
});

function hex(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

function Person({ x, fill = "#4A5596" }: { x: number; fill?: string }) {
  return (
    <>
      <circle cx={x} cy={GROUND - 62} r="11" fill={fill} />
      <path
        d={`M${x - 15} ${GROUND}L${x - 13} ${GROUND - 42}Q${x} ${GROUND - 53} ${x + 13} ${GROUND - 42}L${x + 15} ${GROUND}Z`}
        fill={fill}
      />
    </>
  );
}

function Label({ x, children }: { x: number; children: string }) {
  return (
    <text x={x} y={GROUND + 30} textAnchor="middle" fontSize="15" fontFamily="ui-monospace, Menlo, monospace" fill="#C3C9E8">
      {children}
    </text>
  );
}

function NightScene({ id, viewBox, className }: { id: string; viewBox: string; className: string }) {
  const door = 1010;
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMaxYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`arb-sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070B24" />
          <stop offset="1" stopColor="#1D2559" />
        </linearGradient>
        <radialGradient id={`arb-halo-${id}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#F2B14C" stopOpacity=".55" />
          <stop offset="1" stopColor="#F2B14C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`arb-orb-${id}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#9FE8FF" />
          <stop offset="1" stopColor="#9FE8FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#arb-sky-${id})`} />

      {stars.map((s, i) => (
        <circle
          key={i}
          className="arb-twinkle"
          style={{ animationDelay: `-${s.delay}s` }}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#fff"
          opacity={0.5 + (i % 4) * 0.12}
        />
      ))}

      {/* moon */}
      <circle cx="1172" cy="104" r="16" fill="#F4F0DC" />
      <circle cx="1180" cy="99" r="14" fill="#0C1231" />

      <rect y={GROUND} width={W} height={H - GROUND} fill="#0E1440" />

      {/* door light */}
      <ellipse className="arb-flicker" cx={door + 44} cy="210" rx="150" ry="130" fill={`url(#arb-halo-${id})`} />
      <polygon
        className="arb-flicker"
        points={`${door},${GROUND} ${door + 88},${GROUND} ${door - 90},${H} ${door - 360},${H}`}
        fill="#F2B14C"
        opacity=".2"
      />
      <rect x={door - 5} y="128" width="98" height={GROUND - 128} fill="#2A3270" />
      <rect x={door} y="134" width="88" height={GROUND - 134} fill="#F2B14C" />
      <polygon points={`${door + 88},134 ${door + 134},120 ${door + 134},${GROUND + 8} ${door + 88},${GROUND}`} fill="#1A2150" />
      <circle cx={door + 120} cy="214" r="3.5" fill="#F2B14C" />
      <circle cx={door + 44} cy="112" r="6" fill="#FFE2A8" />
      <text x={door + 44} y="238" textAnchor="middle" fontSize="70" fontWeight="900" fill="#1B1606" opacity=".85">
        ?
      </text>

      {/* human */}
      <g className="arb-bob">
        <Person x={735} />
      </g>
      <Label x={735}>Human</Label>
      {/* AI agent */}
      <g className="arb-bob" style={{ animationDelay: "-1s" }}>
        <polygon points={hex(830, GROUND - 62, 13)} fill="#93A2FF" />
        <circle cx="830" cy={GROUND - 62} r="3.2" fill="#0A1030" />
        <line x1="830" y1={GROUND - 75} x2="830" y2={GROUND - 84} stroke="#93A2FF" strokeWidth="2" />
        <circle cx="830" cy={GROUND - 87} r="2.8" fill="#93A2FF" />
        <rect x="815" y={GROUND - 45} width="30" height="45" rx="8" fill="#4A5596" />
      </g>
      <Label x={830}>AI agent</Label>
      {/* human using AI */}
      <g className="arb-bob" style={{ animationDelay: "-2s" }}>
        <Person x={925} />
        <circle cx="948" cy={GROUND - 58} r="14" fill={`url(#arb-orb-${id})`} />
        <circle cx="948" cy={GROUND - 58} r="4.5" fill="#CFF4FF" />
      </g>
      <Label x={925}>Human + AI</Label>
    </svg>
  );
}

export default function AiReadinessBanner() {
  return (
    <section id="ai-readiness" className="scroll-mt-6 px-4 pt-10 sm:px-8">
      <a
        href="/ai-readiness"
        className="group relative block w-full overflow-hidden rounded-2xl border border-white/10 bg-[#070B24] transition hover:border-[#F2B14C]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B14C]"
      >
        {/* tablet and desktop: the scene fills the card behind the text */}
        <NightScene id="wide" viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 hidden h-full w-full md:block" />
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#070B24] via-[#070B24]/75 to-transparent md:block" />

        <div className="relative z-10 flex flex-col gap-3 px-6 pb-2 pt-7 sm:px-10 md:max-w-[58%] md:pb-12 md:pt-12 lg:max-w-[50%]">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F2B14C]">
            New · AI readiness check · EN / ES
          </span>
          <h3 className="text-4xl font-black uppercase leading-none sm:text-5xl lg:text-6xl">Who&apos;s knocking?</h3>
          <p className="max-w-xl text-base text-gray-200 sm:text-lg">
            14 scenarios from one night shift when the attacker is an AI. See where you stand on agent identity, APIs,
            cloud, deepfakes and the AI supply chain, and leave with a 12-month roadmap.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="rounded-full bg-[#F2B14C] px-6 py-3 font-bold text-[#1B1606] transition group-hover:translate-x-1">
              Start the shift →
            </span>
            <span className="text-xs text-gray-400">About 5 minutes · No sign-up · Nothing leaves your browser</span>
          </div>
        </div>

        {/* phones: the scene sits under the text, framed on the figures and the door */}
        <div className="relative h-52 sm:h-60 md:hidden">
          <NightScene id="narrow" viewBox="690 70 510 300" className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#070B24] to-transparent" />
        </div>
      </a>
    </section>
  );
}
