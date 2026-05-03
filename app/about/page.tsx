export default function About() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative min-h-screen bg-[url('https://images.unsplash.com/photo-1518770660439-4636190af475')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />

        <nav className="relative z-10 flex items-center gap-8 px-8 py-6">
          <a href="/" className="text-3xl font-black text-red-600">
            AVA BYTEGUARD
          </a>

          <a href="/" className="text-sm text-gray-300 hover:text-white">
            Home
          </a>
        </nav>

        <div className="relative z-10 max-w-4xl px-8 pt-24">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-red-500">
            About
          </p>

          <h1 className="mb-6 text-5xl font-black leading-tight">
            Who is Ava ByteGuard?
          </h1>

          <p className="mb-6 text-xl leading-relaxed text-gray-200">
            Ava ByteGuard is a digital avatar born from curiosity and the
            exploration of modern AI tools. It serves as a creative way to stay
            up to date with cybersecurity news, trends, and insights in an
            ever-evolving digital world.
          </p>

          <p className="mb-6 text-lg leading-relaxed text-gray-300">
            Through engaging and accessible content, Ava explores emerging
            threats, technological advances, and practical ways to stay safe
            online — making cybersecurity easier to understand for everyone.
          </p>

          <p className="rounded-xl border border-red-600/40 bg-red-950/30 p-5 text-lg italic text-gray-200">
            “Any resemblance to reality is purely intentional.”
          </p>
        </div>
      </section>
    </main>
  );
}