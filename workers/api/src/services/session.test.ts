import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { createMockD1 } from "../test-utils/d1-mock";
import { SessionService, makeSessionServiceLayer } from "./session";

describe("SessionService", () => {
  it("should register session ownership", async () => {
    const db = createMockD1();
    const layer = makeSessionServiceLayer(db);
    
    const program = Effect.gen(function* () {
      const service = yield* SessionService;
      yield* service.register("user-123", "session-abc");
      return yield* service.listOwned("user-123");
    });
    
    const result = await Effect.runPromise(Effect.provide(program, layer));
    
    expect(result).toContain("session-abc");
    expect(result.length).toBe(1);
  });

  it("should check ownership correctly", async () => {
    const db = createMockD1();
    const layer = makeSessionServiceLayer(db);
    
    const program = Effect.gen(function* () {
      const service = yield* SessionService;
      yield* service.register("user-123", "session-abc");
      
      const isOwned = yield* service.checkOwnership("user-123", "session-abc");
      const isOtherOwned = yield* service.checkOwnership("user-456", "session-abc");
      
      return { isOwned, isOtherOwned };
    });
    
    const { isOwned, isOtherOwned } = await Effect.runPromise(Effect.provide(program, layer));
    
    expect(isOwned).toBe(true);
    expect(isOtherOwned).toBe(false);
  });

  it("should unregister session ownership", async () => {
    const db = createMockD1();
    const layer = makeSessionServiceLayer(db);
    
    const program = Effect.gen(function* () {
      const service = yield* SessionService;
      yield* service.register("user-123", "session-abc");
      yield* service.unregister("user-123", "session-abc");
      return yield* service.listOwned("user-123");
    });
    
    const result = await Effect.runPromise(Effect.provide(program, layer));
    
    expect(result).not.toContain("session-abc");
    expect(result.length).toBe(0);
  });

  it("should list owned sessions in reverse chronological order", async () => {
    const db = createMockD1();
    const layer = makeSessionServiceLayer(db);
    
    const program = Effect.gen(function* () {
      const service = yield* SessionService;
      yield* service.register("user-123", "session-1");
      yield* Effect.sleep("1100 millis");
      yield* service.register("user-123", "session-2");
      
      return yield* service.listOwned("user-123");
    });
    
    const result = await Effect.runPromise(Effect.provide(program, layer));
    
    // Most recent first
    expect(result[0]).toBe("session-2");
    expect(result[1]).toBe("session-1");
  });
});
