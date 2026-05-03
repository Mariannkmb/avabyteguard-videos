"use client";

import { useEffect, useRef, useState } from "react";

const size = 14;

type Position = { x: number; y: number };

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
  const touchStart = useRef<Position | null>(null);

  const [gameOpen, setGameOpen] = useState(false);
  const [player, setPlayer] = useState<Position>({ x: 1, y: 1 });
  const [bugs, setBugs] = useState<Position[]>(initialBugs);
  const [dots, setDots] = useState<Position[]>(initialDots);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(false);

  function isSame(a: Position, b: Position) {
    return a.x === b.x && a.y === b.y;
  }

  function resetGame() {
    setPlayer({ x: 1, y: 1 });
    setBugs(initialBugs);
    setDots(initialDots);
    setScore(0);
    setGameOver(false);
    setWinner(false);
  }

  function startGame() {
    resetGame();
    setGameStarted(true);
  }

  function closeGame() {
    setGameOpen(false);
    setGameStarted(false);
    resetGame();
  }

  function movePlayer(direction: "up" | "down" | "left" | "right") {
    if (!gameStarted || gameOver || winner) return;

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

        if (newDots.length < currentDots.length) setScore((s) => s + 10);
        if (newDots.length === 0) setWinner(true);

        return newDots;
      });

      return next;
    });
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;

    const minSwipe = 20;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      movePlayer(dx > 0 ? "right" : "left");
    } else {
      movePlayer(dy > 0 ? "down" : "up");
    }

    touchStart.current = null;
  }

  useEffect(() => {
    document.body.style.overflow = gameOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [gameOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!gameOpen) return;

      if (e.key === "Escape") closeGame();
      if (e.key === "ArrowUp") movePlayer("up");
      if (e.key === "ArrowDown") movePlayer("down");
      if (e.key === "ArrowLeft") movePlayer("left");
      if (e.key === "ArrowRight") movePlayer("right");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (!gameOpen || !gameStarted || gameOver || winner) return;

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

          if (viruses.some((virus) => isSame(virus, next))) return bug;
          if (isSame(next, player)) setGameOver(true);

          return next;
        })
      );
    }, 450);

    return () => clearInterval(interval);
  }, [player, gameOpen, gameStarted, gameOver, winner]);

  return (
    <section className="bg-black px-8 py-16 text-white">
      <div className="rounded-2xl border-2 border-red-600 bg-zinc-950 p-6 shadow-[0_0_30px_rgba(220,38,38,0.45)]">
        <h2 className="mb-2 text-3xl font-black text-red-600">
          Byte Muncher
        </h2>

        <p className="mb-6 text-gray-300">
          A mini cybersecurity arcade game. Collect bytes, avoid bugs, and do
          not touch the viruses.
        </p>

        <button
          onClick={() => {
            setGameOpen(true);
            setGameStarted(false);
            resetGame();
          }}
          className="rounded bg-red-600 px-6 py-3 font-bold hover:bg-red-700"
        >
          Open Game
        </button>
      </div>

      {gameOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[radial-gradient(circle_at_center,#1a0000,#000)] p-4 text-white">
          <div className="mx-auto flex h-full max-w-5xl flex-col justify-center">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black tracking-widest text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.9)]">
                  Byte Muncher
                </h2>
                <p className="text-sm text-gray-400">
                  Desktop: arrow keys. Mobile: swipe on the board.
                </p>
              </div>

              <button
                onClick={closeGame}
                className="rounded bg-zinc-800 px-4 py-2 font-bold hover:bg-zinc-700"
              >
                ✕ Close
              </button>
            </div>

            <div className="mb-4 flex items-center gap-4">
              <p className="font-bold">Score: {score}</p>

              <button
                onClick={startGame}
                className="rounded bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
              >
                {gameStarted ? "Restart" : "Start Game"}
              </button>
            </div>

            {!gameStarted && (
              <p className="mb-4 rounded bg-zinc-800 px-4 py-3 font-bold">
                Press Start Game to begin.
              </p>
            )}

            {(gameOver || winner) && (
              <p
                className={`mb-4 rounded px-4 py-3 text-xl font-black ${
                  gameOver
                    ? "bg-red-600 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                {gameOver ? "Game Over — you were infected!" : "Winner!!"}
              </p>
            )}

            <div className="flex flex-1 items-center justify-center">
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="touch-none select-none rounded-xl bg-zinc-950 p-2 sm:p-4 w-full max-w-[92vw] sm:max-w-[520px] flex items-center justify-center"
                >
                <div
                  className="grid w-fit gap-1"
                  style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: size * size }).map((_, index) => {
                    const x = index % size;
                    const y = Math.floor(index / size);
                    const current = { x, y };

                    const isPlayer = isSame(player, current);
                    const isBug = bugs.some((bug) => isSame(bug, current));
                    const isVirus = viruses.some((virus) =>
                      isSame(virus, current)
                    );
                    const hasDot = dots.some((dot) => isSame(dot, current));

                    return (
                      <div
                        key={index}
                       className="flex aspect-square w-full select-none items-center justify-center rounded bg-zinc-900 text-sm sm:text-lg shadow-inner"
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
            </div>
          </div>
        </div>
      )}
    </section>
  );
}