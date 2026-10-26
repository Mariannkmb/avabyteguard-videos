"use client";

// Easter egg on the About page: the avatar's closing line hides the human behind Ava.
// It glitches briefly every few seconds (and on hover or focus) to invite a click.

import { useState } from "react";

export default function HumanReveal() {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <p
        className="human-reveal rounded-xl border border-red-600/40 bg-red-950/30 p-5 text-lg text-gray-200"
        aria-live="polite"
      >
        OK, you caught me. Meet the human behind Ava{" "}
        <a
          href="https://www.mariann.me"
          target="_blank"
          rel="noopener"
          className="font-semibold text-white underline decoration-red-500 underline-offset-4 hover:text-red-300"
        >
          → mariann.me
        </a>
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      aria-expanded={revealed}
      title="Really?"
      className="glitch w-full cursor-pointer rounded-xl border border-red-600/40 bg-red-950/30 p-5 text-left text-lg italic text-gray-200 transition-colors hover:border-red-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
    >
      <span className="glitch-text" data-text="“Any resemblance to reality is purely intentional.”">
        “Any resemblance to reality is purely intentional.”
      </span>
    </button>
  );
}
