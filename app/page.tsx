"use client";

import { useState } from "react";
import ByteMuncher from "./components/ByteMuncher";
import ZoneGuard from "./components/ZoneGuard";
import AiReadinessBanner from "./components/AiReadinessBanner";
import SiteNav from "./components/SiteNav";

const videos = [
  { title: "AI found a flaw in 70% of websites. Is yours one of them?", id: "SWa85MEgfiA", type: "short", year: "2026" },
  { title: "They didn't hack his computer. They cloned his CEO!", id: "8S8CslfhO_A", type: "short", year: "2026" },
  { title: "The Padlock Was Real. The Route Was Hijacked", id: "CCs2SgIvBqs", type: "short", year: "2026" },
  { title: "The Paradox of AI Hallucinations", id: "q6U8sIUS3F8", type: "video", year: "2026" },
  { title: "Artemis II The Cyber Frontier", id: "AzYxyKP3PhU", type: "video", year: "2026" },
  { title: "Quantum Security The 2026 Shift", id: "eX-I0pdgPio", type: "short", year: "2026" },
  { title: "Cybersecurity 2026: What Really Changes", id: "pqipoYNFCPI", type: "short", year: "2026" },

  { title: "Cyber News October 2025", id: "EBodKr-ZUp8", type: "short", year: "2025" },
  { title: "Cyber News September 2025", id: "IdjR6JptHok", type: "short", year: "2025" },
  { title: "Cyber News August 2025", id: "jK5Ce_Rbvnc", type: "video", year: "2025" },
  { title: "AI Friend and Lover", id: "xm9sluoR4hw", type: "video", year: "2025" },
  { title: "Partirock Phishguard Video", id: "3fQdx-8uDNw", type: "video", year: "2025" },

  { title: "Revamping Password Security: NIST's New Guidelines Explained", id: "L-FAJySAnao", type: "video", year: "2024" },
  { title: "The Impact of Third Party Providers on Cybersecurity", id: "XyVcq7dbvzI", type: "video", year: "2024" },
  { title: "The Future of Energy: Nuclear Batteries", id: "-8IEP0CDTUE", type: "video", year: "2024" },
  { title: "Find Impersonations & Digital Footprint Online", id: "9qe-pcsj8tk", type: "video", year: "2024" },

  { title: "Serious Cybersecurity Incidents of 2023", id: "pwi02nrgm1g", type: "video", year: "2023" },
  { title: "A Series of Unfortunate Events", id: "7UH16YgxIi0", type: "video", year: "2023" },
  { title: "The Dark Web Unveiled", id: "P--HsLaMYwQ", type: "video", year: "2023" },
  { title: "Cyber Attacks on U.S. Water Systems", id: "gk5Ghz17BR0", type: "video", year: "2023" },
];

const years = Array.from(new Set(videos.map(v => v.year))).sort((a,b)=>Number(b)-Number(a));

export default function Home() {
  const [selectedVideo, setSelectedVideo] = useState<(typeof videos)[0] | null>(null);
  const latestVideo = videos[0];

  return (
    <main className="min-h-screen bg-black text-white">
      <section
        className="relative min-h-[85vh] bg-cover bg-center"
        style={{
          backgroundImage: `url(https://img.youtube.com/vi/${latestVideo.id}/maxresdefault.jpg)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

        <SiteNav current="home" />

        <div className="relative z-10 px-8 pt-24 max-w-2xl">
          <h2 className="text-5xl font-black mb-4">{latestVideo.title}</h2>

          <p className="mb-6 text-lg text-gray-200">
            Watch AvaByteGuard videos about cybersecurity, online safety, and digital protection.
          </p>

          <button
            onClick={() => setSelectedVideo(latestVideo)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 font-bold text-black transition hover:-translate-y-0.5 hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {/* An SVG icon, so phones don't swap the ▶ character for a blue emoji */}
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" />
            </svg>
            Play
          </button>
        </div>
      </section>

      <AiReadinessBanner />

      <section className="px-8 py-10 space-y-10">
        {years.map((year) => (
          <div key={year}>
            <h3 className="text-2xl font-bold mb-4">{year}</h3>

            <div className="flex gap-4 overflow-x-auto">
              {videos
                .filter((v) => v.year === year)
                .map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="min-w-[250px] cursor-pointer"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                      className="rounded"
                    />
                    <p className="mt-2 text-sm">{video.title}</p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </section>

      {selectedVideo && (
        // Phones: the player fills the screen. Larger screens: centred, as before.
        // Shorts are vertical (9:16), so they get a tall player instead of a 16:9 box.
        <div className="fixed inset-0 z-50 flex flex-col bg-black sm:items-center sm:justify-center sm:bg-black/90 sm:p-6">
          <div
            className={`flex h-full w-full flex-col sm:h-auto ${
              selectedVideo.type === "short" ? "sm:w-auto" : "sm:max-w-4xl"
            }`}
          >
            <button
              onClick={() => setSelectedVideo(null)}
              className="self-end px-4 py-3 text-white sm:mb-3 sm:px-0 sm:py-0"
            >
              ✕ Close
            </button>

            <div className="flex flex-1 items-center justify-center">
              <iframe
                className={
                  selectedVideo.type === "short"
                    ? "h-full w-full sm:h-[85vh] sm:w-auto sm:aspect-[9/16]"
                    : "aspect-video w-full"
                }
                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0&playsinline=1`}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
      <section id="games" className="scroll-mt-6 px-8 pt-4 pb-16">
        <h3 className="text-2xl font-bold">Games</h3>
        <p className="mb-4 text-sm text-gray-400">Take a break and train your security instincts.</p>
        <div className="grid max-w-5xl gap-4 md:grid-cols-2">
          <ByteMuncher />
          <ZoneGuard />
        </div>
      </section>
    </main>
  );
}
