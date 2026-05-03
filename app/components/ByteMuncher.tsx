"use client";

import { useEffect, useState } from "react";

const size = 14;

type Position = {
  x: number;
  y: number;
};

const initialDots: Position[] = Array.from({ length: 60 }, (_, i) => ({
  x: (i * 5 + 2) % size,
  y: (i * 7 + 3) % size,
}));

const initialBugs: Position[] = [
  { x: 12, y: 12 },
  { x: 1, y: 12 },
  { x: 12, y: 1 },
  { x: 7, y: 7 },
  { x: 4, y: 10 },
];

const viruses: Position[] = [
  { x: 3, y: 3 },
  { x: 5, y: 5 },
  { x: 8, y: 4 },
  { x: 10, y: 8 },
  { x: 6, y: 11 },
  { x: 11, y: 3 },
  { x: 2, y: 9 },
];

export default function ByteMuncher() {
  const [player, setPlayer] = useState<Position>({ x: 1, y: 1 });
  const [bugs, setBugs] = useState<Position[]>(initialBugs);
  const [dots, setDots] = useState<Position[]>(initialDots);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(false);

  function isSame(a: Position, b: Position) {
    return a.x === b.x && a.y === b.y;
  }

  function movePlayer(direction: "up" | "down" | "left" | "right") {
    if (gameOver || winner) return;

    setPlayer((current) => {
      const next = { ...current };

      if (direction === "up") next.y = Math.max(0, current.y - 1);
      if (direction === "down") next.y = Math.min(size - 1, current.y + 1);
      if (direction === "left") next.x = Math.max(0, current.x - 1);
      if (direction === "right") next.x = Math.min(size - 1, current.x + 1);

      if (
        bugs.some((bug) => isSame(bug, next)) ||
        viruses.some((virus) => isSame(virus, next))
      ) {
        setGameOver(true);
      }

      setDots((currentDots) => {
        const newDots = currentDots.filter((dot) => !isSame(dot, next));

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowUp") movePlayer("up");
      if (e.key === "ArrowDown") movePlayer("down");
      if (e.key === "ArrowLeft") movePlayer("left");
      if (e.key === "ArrowRight") movePlayer("right");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

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

          if (viruses.some((virus) => isSame(virus, next))) {
            return bug;
          }

          if (isSame(next, player)) {
            setGameOver(true);
          }

          return next;
        })
      );
    }, 450);

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
      <h2 className="mb-2 text-3xl font-black text-red-600">Byte Muncher</h2>

      <p className="mb-4 text-gray-300">
        Collect all bytes, avoid the bugs, and do not touch the viruses.
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

      {(gameOver || winner) && (
        <p
          className={`mb-4 rounded px-4 py-3 text-xl font-black ${
            gameOver ? "bg-red-600 text-white" : "bg-green-600 text-white"
          }`}
        >
          {gameOver ? "Game Over — you were infected!" : "Winner!!"}
        </p>
      )}

      <div className="overflow-x-auto">
        <div
          className="grid w-fit gap-1 rounded-xl bg-zinc-950 p-4"
          style={{ gridTemplateColumns: `repeat(${size}, 32px)` }}
        >
          {Array.from({ length: size * size }).map((_, index) => {
            const x = index % size;
            const y = Math.floor(index / size);

            const current = { x, y };
            const isPlayer = isSame(player, current);
            const isBug = bugs.some((bug) => isSame(bug, current));
            const isVirus = viruses.some((virus) => isSame(virus, current));
            const hasDot = dots.some((dot) => isSame(dot, current));

            return (
              <div
                key={index}
                className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 text-lg"
              >
                {isPlayer
                  ? "🛡️"
                  : isBug
                  ? "🐞"
                  : isVirus
                  ? "🦠"
                  : hasDot
                  ? "•"
                  : ""}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 md:hidden">
        <button
          onClick={() => movePlayer("up")}
          className="rounded bg-zinc-800 px-6 py-3 text-xl font-bold"
        >
          ↑
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => movePlayer("left")}
            className="rounded bg-zinc-800 px-6 py-3 text-xl font-bold"
          >
            ←
          </button>

          <button
            onClick={() => movePlayer("down")}
            className="rounded bg-zinc-800 px-6 py-3 text-xl font-bold"
          >
            ↓
          </button>

          <button
            onClick={() => movePlayer("right")}
            className="rounded bg-zinc-800 px-6 py-3 text-xl font-bold"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}