import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canRunOwnerAnalysis } from "./moderation.ts";

Deno.test("owners cannot overwrite a flagged moderation result", () => {
  assertEquals(canRunOwnerAnalysis("flagged", false), false);
});

Deno.test("staff can re-evaluate a flagged moderation result", () => {
  assertEquals(canRunOwnerAnalysis("flagged", true), true);
});
