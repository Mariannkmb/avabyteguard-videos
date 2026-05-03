export default function About() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative min-h-screen bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />

        <nav className="relative z-10 flex items-center gap-8 px-8 py-6">
          <a href="/" className="text-3xl font-black text-red-600">
            AVABYTEGUARD
          </a>

          <a href="/" className="text-sm text-gray-300 hover:text-white">
            Home
          </a>
        </nav>

        <div className="relative z-10 max-w-4xl px-8 pt-24">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-red-500">
            About Us
          </p>

          <h1 className="mb-6 text-5xl font-black leading-tight">
            Who is Ava ByteGuard?
          </h1>

          <p className="mb-6 text-xl leading-relaxed text-gray-200">
            Ava ByteGuard es un avatar que nace de la curiosidad de jugar con
            las nuevas herramientas de IA y una buena forma de mantenerse al día
            con las noticias e información relacionada a Ciberseguridad.
          </p>

          <p className="mb-8 text-lg leading-relaxed text-gray-300">
            Ava explora noticias, tendencias, riesgos digitales y avances
            tecnológicos para hacer que la ciberseguridad sea más clara,
            cercana y fácil de entender.
          </p>

          <p className="rounded-xl border border-red-600/40 bg-red-950/30 p-5 text-lg italic text-gray-200">
            “Cualquier parecido a la realidad no es coincidencia.”
          </p>
        </div>
      </section>
    </main>
  );
}