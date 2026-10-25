const stars = [
  [12, 18], [40, 52], [70, 14], [96, 40], [130, 22], [158, 60], [182, 12], [210, 44],
  [236, 20], [262, 58], [290, 30], [318, 10], [344, 48], [372, 24],
];

function DoorScene() {
  const ground = 150;
  return (
    <svg viewBox="0 0 400 180" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="arb-halo" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#F2B14C" stopOpacity=".55" />
          <stop offset="1" stopColor="#F2B14C" stopOpacity="0" />
        </radialGradient>
      </defs>
      {stars.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.9} fill="#fff" opacity={0.4 + (i % 4) * 0.15} />
      ))}
      <ellipse cx="320" cy="96" rx="80" ry="70" fill="url(#arb-halo)" />
      <polygon points={`292,${ground} 346,${ground} 250,180 120,180`} fill="#F2B14C" opacity=".2" />
      <rect x="288" y="52" width="62" height={ground - 52} fill="#2A3270" />
      <rect x="293" y="57" width="52" height={ground - 57} fill="#F2B14C" />
      <polygon points={`345,57 372,48 372,${ground + 6} 345,${ground}`} fill="#1A2150" />
      <text x="319" y="118" textAnchor="middle" fontSize="44" fontWeight="900" fill="#1B1606" opacity=".85">?</text>
      {/* human */}
      <circle cx="150" cy={ground - 46} r="8" fill="#4A5596" />
      <path d={`M139 ${ground}L141 ${ground - 32}Q150 ${ground - 39} 159 ${ground - 32}L161 ${ground}Z`} fill="#4A5596" />
      {/* AI agent */}
      <polygon points="206,95 215,100 215,110 206,115 197,110 197,100" fill="#93A2FF" />
      <rect x="195" y={ground - 33} width="22" height="33" rx="6" fill="#4A5596" />
      {/* human + AI */}
      <circle cx="258" cy={ground - 46} r="8" fill="#4A5596" />
      <path d={`M247 ${ground}L249 ${ground - 32}Q258 ${ground - 39} 267 ${ground - 32}L269 ${ground}Z`} fill="#4A5596" />
      <circle cx="275" cy={ground - 44} r="4" fill="#CFF4FF" />
      <rect y={ground} width="400" height={180 - ground} fill="#0E1440" />
    </svg>
  );
}

export default function AiReadinessBanner() {
  return (
    <section id="ai-readiness" className="scroll-mt-6 px-8 pt-10">
      <a
        href="/ai-readiness"
        className="group relative grid max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#070B24] to-[#1D2559] transition hover:border-[#F2B14C]/60 md:grid-cols-[1.2fr_1fr]"
      >
        <div className="relative z-10 flex flex-col gap-3 p-6 md:p-8">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F2B14C]">
            New · AI readiness check · EN / ES
          </span>
          <h3 className="text-3xl font-black uppercase leading-none md:text-5xl">Who&apos;s knocking?</h3>
          <p className="max-w-md text-gray-200">
            14 scenarios from one night shift when the attacker is an AI. Find out where you stand on agent
            identity, APIs, cloud, deepfakes and more, and get a 12-month roadmap.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <span className="rounded-full bg-[#F2B14C] px-5 py-2.5 font-bold text-[#1B1606] transition group-hover:translate-x-1">
              Start the shift →
            </span>
            <span className="text-xs text-gray-400">About 5 minutes · No sign-up · Nothing leaves your browser</span>
          </div>
        </div>
        <div className="relative h-44 md:h-auto">
          <DoorScene />
        </div>
      </a>
    </section>
  );
}
