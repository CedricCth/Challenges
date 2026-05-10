import { afterEach, describe, expect, it } from "vitest";

import { ChallengeTypeFactory } from "./factory";
import { FitnessStrategy } from "./strategies/fitness";

afterEach(() => {
  ChallengeTypeFactory.reset();
});

describe("ChallengeTypeFactory", () => {
  it("returns the strategy registered for a given key", () => {
    const strategy = new FitnessStrategy();
    ChallengeTypeFactory.register(strategy);
    expect(ChallengeTypeFactory.get("fitness")).toBe(strategy);
  });

  it("throws a helpful error for unknown keys", () => {
    expect(() => ChallengeTypeFactory.get("reading")).toThrow(
      /no strategy registered/i,
    );
  });

  it("refuses to register two strategies for the same key", () => {
    ChallengeTypeFactory.register(new FitnessStrategy());
    expect(() => ChallengeTypeFactory.register(new FitnessStrategy())).toThrow(
      /already registered/i,
    );
  });

  it("list() returns every registered strategy", () => {
    ChallengeTypeFactory.register(new FitnessStrategy());
    expect(ChallengeTypeFactory.list().map((s) => s.key)).toEqual(["fitness"]);
  });

  it("has() reflects the current registration state", () => {
    expect(ChallengeTypeFactory.has("fitness")).toBe(false);
    ChallengeTypeFactory.register(new FitnessStrategy());
    expect(ChallengeTypeFactory.has("fitness")).toBe(true);
  });
});
