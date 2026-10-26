// Shared top navigation for every AvaByteGuard page.
// The AI readiness page (public/ai-readiness/index.html) carries a static copy of this bar: keep both in sync.

import Link from "next/link";

type Page = "home" | "ai-readiness" | "games" | "about";

const links: { id: Page; href: string; label: string }[] = [
  { id: "home", href: "/", label: "Home" },
  { id: "ai-readiness", href: "/ai-readiness", label: "AI Readiness" },
  { id: "games", href: "/#games", label: "Games" },
  { id: "about", href: "/about", label: "About" },
];

export default function SiteNav({ current }: { current?: Page }) {
  return (
    <nav className="relative z-10 flex flex-wrap items-center gap-x-8 gap-y-2 px-8 py-6">
      <Link href="/" className="text-3xl font-black text-red-600">
        AVA BYTEGUARD
      </Link>
      {links.map((l) => {
        const isCurrent = l.id === current;
        const promo = l.id === "ai-readiness";
        const className =
          "text-sm hover:text-white " +
          (promo ? "font-semibold text-[#F2B14C]" : isCurrent ? "font-semibold text-white" : "text-gray-300");
        // The readiness check is a static page in /public, so it needs a full page load, not client routing.
        return promo ? (
          <a key={l.id} href={l.href} aria-current={isCurrent ? "page" : undefined} className={className}>
            {l.label}
          </a>
        ) : (
          <Link key={l.id} href={l.href} aria-current={isCurrent ? "page" : undefined} className={className}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
