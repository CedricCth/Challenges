export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Cedi <span className="text-zinc-400">vs</span> Stefi
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Our private little arena. Login coming next phase.
      </p>
      <p className="text-xs text-zinc-400">
        Phase 1 scaffold — Next.js {process.env.NODE_ENV === "production" ? "prod" : "dev"} build OK.
      </p>
    </main>
  );
}
