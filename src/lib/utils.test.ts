import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("combines conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("px-2 text-sm", { hidden: false }, ["px-4", "font-bold"])).toBe(
      "text-sm px-4 font-bold",
    );
  });
});
