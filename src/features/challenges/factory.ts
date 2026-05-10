import type { ChallengeStrategy } from "./strategy";

/**
 * Registry of challenge-type strategies. Adding a new type means writing a
 * new strategy file and calling `ChallengeTypeFactory.register(...)` in the
 * composition root (src/server/composition.ts) — nothing else changes.
 *
 * The factory does not import any concrete strategy itself. That's
 * deliberate: if it did, we'd violate OCP (factory.ts would change every
 * time a type is added). See ADR-006.
 */
class ChallengeTypeFactoryImpl {
  private readonly map = new Map<string, ChallengeStrategy>();

  register(strategy: ChallengeStrategy): void {
    if (this.map.has(strategy.key)) {
      throw new Error(
        `ChallengeTypeFactory: a strategy is already registered for key "${strategy.key}".`,
      );
    }
    this.map.set(strategy.key, strategy);
  }

  get(key: string): ChallengeStrategy {
    const strategy = this.map.get(key);
    if (!strategy) {
      throw new Error(
        `ChallengeTypeFactory: no strategy registered for key "${key}". Did you forget to register it in composition.ts?`,
      );
    }
    return strategy;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  list(): ChallengeStrategy[] {
    return [...this.map.values()];
  }

  /** For tests only — wipe the registry so each test starts clean. */
  reset(): void {
    this.map.clear();
  }
}

export const ChallengeTypeFactory = new ChallengeTypeFactoryImpl();
