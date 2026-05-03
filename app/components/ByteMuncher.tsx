"use client";

import { useEffect, useState } from "react";

const size = 12;

type Position = {
  x: number;
  y: number;
};

const initialDots: Position[] = Array.from({ length: 45 }, (_, i) => ({
  x: (i * 5 + 2) % size,
  y: (i * 7 + 3) % size,
}));

const initialBugs: Position[] = [
  { x: 10, y: 10 },
  { x: 1, y: 10 },
  { x: 10, y: 1 },
  { x: 6, y: 6 },
];

export default function ByteMuncher() {
  const [player, setPlayer] = useState<Position>({ x: 1, y: 1 });
  const [bugs, setBugs] = useState<Position[]>(initialBugs);
  const [dots, setDots] = useState(initialDots);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (gameOver || winner) return;

      setPlayer((current) => {
        const next = { ...current };

        if (e.key === "ArrowUp") next.y = Math.max(0, current.y - 1);
        if (e.key === "ArrowDown") next.y = Math.min(size - 1, current.y + 1);
        if (e.key === "ArrowLeft") next.x = Math.max(0, current.x - 1);
        if (e.key === "ArrowRight") next.x = Math.min(size - 1, current.x + 1);

        if (bugs.some((bug) => bug.x === next.x && bug.y === next.y)) {
          setGameOver(true);
        }

        setDots((currentDots) => {
          const newDots = currentDots.filter(
            (dot) => !(dot.x === next.x && dot.y === next.y)
          );

          if (newDots.length < currentDots.length) {
            setScore((s) => s + 10);
          }

          if (newDots.length === 0) {
            setWinner(true);
          }

          return newDots;
        });

        return next;
      });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bugs, gameOver, winner]);

  useEffect(() => {
    if (gameOver || winner) return;

    const interval = setInterval(() => {
      setBugs((currentBugs) =>
        currentBugs.map((bug, index) => {
          const next = { ...bug };

          if (index % 2 === 0) {
            if (player.x > bug.x) next.x += 1;
            else if (player.x < bug.x) next.x -= 1;
            else if (player.y > bug.y) next.y += 1;
            else if (player.y < bug.y) next.y -= 1;
          } else {
            if (player.y > bug.y) next.y += 1;
            else if (player.y < bug.y) next.y -= 1;
            else if (player.x > bug.x) next.x += 1;
            else if (player.x < bug.x) next.x -= 1;
          }

          if (next.x === player.x && next.y === player.y) {
            setGameOver(true);
          }

          return next;
        })
      );
    }, 650);

    return () => clearInterval(interval);
  }, [player, gameOver, winner]);

  function restartGame() {
    setPlayer({ x: 1, y: 1 });
    setBugs(initialBugs);
    setDots(initialDots);
    setScore(0);
    setGameOver(false);
    setWinner(false);
  }

  return (
    <section className="bg-black px-8 py-16 text-white">
      <h2 className="mb-2 text-3xl font-black text-red-600">
        Byte Muncher
      </h2>

      <p className="mb-4 text-gray-300">
        Use the arrow keys to collect all bytes and avoid the bugs.
      </p>

      <div className="mb-4 flex items-center gap-4">
        <p className="font-bold">Score: {score}</p>

        <button
          onClick={restartGame}
          className="rounded bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
        >
          Restart
        </button>
      </div>

      {gameOver && (
        <p className="mb-4 font-bold text-red-400">
          Game Over — the bugs caught you!
        </p>
      )}

      {winner && (
        <p className="mb-4 rounded bg-green-600 px-4 py-3 text-xl font-black">
          Winner!!
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
          const isBug = bugs.some((bug) => bug.x === x && bug.y === y);
          const hasDot = dots.some((dot) => dot.x === x && dot.y === y);

          return (
            <div
              key={index}
              className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 text-lg"
            >
              {isPlayer ? "🛡️" : isBug ? "🐞" : hasDot ? "•" : ""}
            </div>
          );
        })}
      </div>
    </section>
  );
}