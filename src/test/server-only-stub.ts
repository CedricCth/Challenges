// Vitest stub for Next.js' `server-only` import. The real package throws at
// bundle time if a client component imports a server file; in tests we just
// need it to be a no-op module so unit tests can exercise service/repo code.
export {};
