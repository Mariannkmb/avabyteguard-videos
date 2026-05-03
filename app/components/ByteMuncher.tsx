"use client";

import { useEffect, useState } from "react";

const size = 10;

export default function ByteMuncher() {
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [score, setScore] = useState(0);
  const [dots, setDots] = useState(
    Array.from({ length: 18 }, (_, i) => ({
      x: (i * 3) % size,
      y: (i * 5 + 2) % size,
    }))
  );

  useEffect(() => {
    function move(e: KeyboardEvent) {
      setPlayer((p) => {
        let next = { ...p };

        if (e.key === "ArrowUp") next.y = Math.max(0, p.y - 1);
        if (e.key === "ArrowDown") next.y = Math.min(size - 1, p.y + 1);
        if (e.key === "ArrowLeft") next.x = Math.max(0, p.x - 1);
        if (e.key === "ArrowRight") next.x = Math.min(size - 1, p.x + 1);

        setDots((oldDots) => {
          const eaten = oldDots.some((d) => d.x === next.x && d.y === next.y);
          if (eaten) setScore((s) => s + 10);
          return oldDots.filter((d) => !(d.x === next.x && d.y === next.y));
        });

        return next;
      });
    }

    window.addEventListener("keydown", move);
    return () => window.removeEventListener("keydown", move);
  }, []);

  return (
    <section className="px-8 py-16 bg-black text-white">
      <h2 className="mb-2 text-3xl font-black text-red-600">
        Byte Muncher
      </h2>

      <p className="mb-6 text-gray-300">
        Use your keyboard arrows to collect the bytes.
      </p>

      <p className="mb-4 font-bold">Score: {score}</p>

      <div className="grid w-fit grid-cols-10 gap-1 rounded-xl bg-zinc-900 p-4">
        {Array.from({ length: size * size }).map((_, index) => {
          const x = index % size;
          const y = Math.floor(index / size);
          const isPlayer = player.x === x && player.y === y;
          const hasDot = dots.some((d) => d.x === x && d.y === y);

          return (
            <div
              key={index}
              className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800"
            >
              {isPlayer ? "🛡️" : hasDot ? "•" : ""}
            </div>
          );
        })}
      </div>
    </section>
  );
}