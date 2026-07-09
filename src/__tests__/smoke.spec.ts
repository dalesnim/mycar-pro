import { describe, expect, it } from "vitest";
import { DEFECT_CATALOG } from "../data/defectCatalog";
import { DEFECT_STATUSES } from "../types/defect";

describe("project wiring (smoke)", () => {
  it("defect catalog has the 4 starter types", () => {
    expect(DEFECT_CATALOG).toHaveLength(4);
    expect(DEFECT_CATALOG.map((t) => t.name)).toContain("вмятина");
  });

  it("status glossary has the 4 lifecycle states", () => {
    expect(DEFECT_STATUSES).toHaveLength(4);
  });
});
