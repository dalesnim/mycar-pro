import { describe, expect, it } from "vitest";
import { summarizeByStatus } from "../logic/summary";
import type { Defect, DefectStatus } from "../types/defect";

let defectSeq = 0;

function makeDefect(status: DefectStatus): Defect {
  defectSeq += 1;
  return {
    id: `d${defectSeq}`,
    vin: "TESTVIN",
    zone: "капот",
    x: 100,
    y: 100,
    z: 0,
    typeId: "dent",
    severity: "незначительный",
    status,
    comment: "",
  };
}

describe("summarizeByStatus", () => {
  it("returns all four statuses with zero counts for an empty list", () => {
    expect(summarizeByStatus([])).toEqual({
      "новый": 0,
      "в ремонте": 0,
      "устранён": 0,
      "отклонён": 0,
    });
  });

  it("counts correctly for a mixed list", () => {
    const defects = [
      makeDefect("новый"),
      makeDefect("новый"),
      makeDefect("в ремонте"),
      makeDefect("устранён"),
      makeDefect("устранён"),
      makeDefect("устранён"),
    ];
    expect(summarizeByStatus(defects)).toEqual({
      "новый": 2,
      "в ремонте": 1,
      "устранён": 3,
      "отклонён": 0,
    });
  });
});
