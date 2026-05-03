"use client";

import { useState } from "react";

const videos = [
  { title: "Artemis II  The Cyber Frontier", id: "AzYxyKP3PhU", type: "video", year: "2026" },
  { title: "Quantum Security  The 2026 Shift", id: "eX-I0pdgPio", type: "short", year: "2026" },
  { title: "Cybersecurity 2026: What Really Changes", id: "pqipoYNFCPI", type: "short", year: "2026" },
  { title: "Cyber News Agosto 2025", id: "jK5Ce_Rbvnc", type: "video", year: "2025" },
  { title: "AI Friend and Lover", id: "xm9sluoR4hw", type: "video", year: "2025" },
  { title: "Partirock Phishguard video", id: "3fQdx-8uDNw", type: "video", year: "2025" },
  { title: "Revamping Password Security NIST's New Guidelines Explained", id: "L-FAJySAnao", type: "video", year: "2024" },
  { title: "The Impact of Third Party Providers on Cybersecurity Should We Set Higher Standards", id: "XyVcq7dbvzI", type: "video", year: "2024" },
  { title: "The Future of Energy Nuclear Batteries Revolutionize Power Generation", id: "-8IEP0CDTUE", type: "video", year: "2024" },
  { title: "Find Impersonations & Digital Footprint Online", id: "9qe-pcsj8tk", type: "video", year: "2024" },
  { title: "Serious Cybersecurity Incidents of 2023 and Recommendations", id: "pwi02nrgm1g", type: "video", year: "2023" },
  { title: "A series of unfortunate events", id: "7UH16YgxIi0", type: "video", year: "2023" },
  { title: "The Dark Web Unveiled A Cyber Criminal Storefront Exposed", id: "P--HsLaMYwQ", type: "video", year: "2023" },
  { title: "Cyber Attacks on U S Water Systems Raise Concerns", id: "gk5Ghz17BR0", type: "video", year: "2023" },
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

        <nav className="relative z-10 px-8 py-6">
          <h1 className="text-3xl font-black text-red-600">AVABYTEGUARD</h1>
          <div className="flex gap-6 text-white text-sm ml-6">
            <a href="/" className="hover:text-gray-300">Home</a>
            <a href="/about" className="hover:text-gray-300">About</a>
          </div>
        </nav>

        <div className="relative z-10 px-8 pt-24 max-w-2xl">
          <h2 className="text-5xl font-black mb-4">{latestVideo.title}</h2>

          <p className="mb-6 text-lg text-gray-200">
            Watch AvaByteGuard videos about cybersecurity, online safety, and digital protection.
          </p>

          <button
            onClick={() => setSelectedVideo(latestVideo)}
            className="bg-white text-black px-6 py-3 rounded font-bold"
          >
            ▶ Play
          </button>
        </div>
      </section>

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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="w-full max-w-4xl">
            <button
              onClick={() => setSelectedVideo(null)}
              className="mb-3 text-white"
            >
              ✕ Close
            </button>

            <iframe
              className="w-full aspect-video"
              src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
              allowFullScreen
            />
          </div>
        </div>
      )}
    </main>
  );
}