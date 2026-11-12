import { describe, it, expect } from "vitest";
import { pickPersisted } from "@/lib/persistence";

describe("pickPersisted", () => {
  it("selects only the persistable fields and drops functions/extras", () => {
    const full = {
      saved: ["a"],
      feedback: { a: "love" as const },
      compare: [],
      preferences: null,
      properties: {},
      role: "buyer" as const,
      realtorProfile: null,
      mlsConnections: [],
      savedSearches: [],
      workspaces: [],
      // extras that must NOT be persisted
      isSaved: () => true,
      toggleSaved: () => {},
      somethingElse: 42,
    };
    const picked = pickPersisted(full as never);
    expect(Object.keys(picked).sort()).toEqual(
      ["compare", "feedback", "mlsConnections", "preferences", "properties", "realtorProfile", "role", "saved", "savedSearches", "workspaces"].sort(),
    );
    expect("isSaved" in picked).toBe(false);
    expect("somethingElse" in picked).toBe(false);
    expect(picked.saved).toEqual(["a"]);
  });

  it("omits undefined fields", () => {
    expect(Object.keys(pickPersisted({ saved: ["x"] }))).toEqual(["saved"]);
  });
});
