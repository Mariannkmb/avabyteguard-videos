"use client";

import { useEffect, useState } from "react";

const size = 12;

type Position = {
  x: number;
  y: number;
};

const initialDots: Position[] = Array.from({ length: 35 }, (_, i) => ({
  x: (i * 5 + 2) % size,
  y: (i * 7 + 3) % size,
}));

export default function ByteMuncher() {
  const [player, setPlayer] = useState<Position>({ x: 1, y: 1 });
  const [ghost, setGhost] = useState<Position>({ x: 10, y: 10 });
  const [dots, setDots] = useState(initialDots);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (gameOver) return;

      setPlayer((current) => {
        const next = { ...current };

        if (e.key === "ArrowUp") next.y = Math.max(0, current.y - 1);
        if (e.key === "ArrowDown") next.y = Math.min(size - 1, current.y + 1);
        if (e.key === "ArrowLeft") next.x = Math.max(0, current.x - 1);
        if (e.key === "ArrowRight") next.x = Math.min(size - 1, current.x + 1);

        setDots((currentDots) => {
          const ateDot = currentDots.some(
            (dot) => dot.x === next.x && dot.y === next.y
          );

          if (ateDot) setScore((s) => s + 10);

          return currentDots.filter(
            (dot) => !(dot.x === next.x && dot.y === next.y)
          );
        });

        return next;
      });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setGhost((current) => {
        const next = { ...current };

        if (player.x > current.x) next.x += 1;
        else if (player.x < current.x) next.x -= 1;
        else if (player.y > current.y) next.y += 1;
        else if (player.y < current.y) next.y -= 1;

        if (next.x === player.x && next.y === player.y) {
          setGameOver(true);
        }

        return next;
      });
    }, 700);

    return () => clearInterval(interval);
  }, [player, gameOver]);

  function restartGame() {
    setPlayer({ x: 1, y: 1 });
    setGhost({ x: 10, y: 10 });
    setDots(initialDots);
    setScore(0);
    setGameOver(false);
  }

  return (
    <section className="bg-black px-8 py-16 text-white">
      <h2 className="mb-2 text-3xl font-black text-red-600">
        Byte Muncher
      </h2>

      <p className="mb-4 text-gray-300">
        Use the arrow keys to collect bytes and avoid the bug.
      </p>

      <div className="mb-4 flex items-center gap-4">
        <p className="font-bold">Score: {score}</p>

        {gameOver && (
          <button
            onClick={restartGame}
            className="rounded bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
          >
            Restart
          </button>
        )}
      </div>

      {gameOver && (
        <p className="mb-4 text-red-400 font-bold">
          Game Over — the bug caught you!
        </p>
      )}

      <div
        className="grid w-fit gap-1 rounded-xl bg-zinc-950 p-4"
        style={{ gridTemplateColumns: `repeat(${size}, 32px)` }}
      >
        {Array.from({ length: size * size }).map((_, index) => {
          const x = index % size;
          const y = Math.floor(index / size);

          const isPlayer = player.x === x && player.y === y;
          const isGhost = ghost.x === x && ghost.y === y;
          const hasDot = dots.some((dot) => dot.x === x && dot.y === y);

          return (
            <div
              key={index}
              className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 text-lg"
            >
              {isPlayer ? "🛡️" : isGhost ? "🐞" : hasDot ? "•" : ""}
            </div>
          );
        })}
      </div>
    </section>
  );
}