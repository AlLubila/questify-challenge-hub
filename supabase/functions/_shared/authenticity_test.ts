import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { advisoryModerationState } from "./authenticity.ts";

Deno.test("high-confidence authentic analysis remains pending for staff review", () => {
  assertEquals(advisoryModerationState({
    isAuthentic: true,
    confidence: 99,
    reason: "Looks original",
    type: "original",
  }), {
    status: "pending",
    moderationStatus: "pending_review",
  });
});

Deno.test("high-confidence inauthentic analysis is flagged but not rejected", () => {
  assertEquals(advisoryModerationState({
    isAuthentic: false,
    confidence: 99,
    reason: "Generated artifacts",
    type: "ai_generated",
  }), {
    status: "pending",
    moderationStatus: "flagged",
  });
});
