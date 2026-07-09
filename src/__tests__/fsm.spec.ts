import { describe, expect, it } from "vitest";
import { TRANSITIONS, allowedTransitions, canTransition } from "../logic/fsm";
import { DEFECT_STATUSES, type DefectStatus } from "../types/defect";

const VALID: Array<[DefectStatus, DefectStatus]> = [
  ["новый", "в ремонте"],
  ["новый", "отклонён"],
  ["в ремонте", "устранён"],
  ["в ремонте", "отклонён"],
];

describe("canTransition", () => {
  it("allows every valid transition", () => {
    for (const [from, to] of VALID) {
      expect(canTransition(from, to), `${from} → ${to}`).toBe(true);
    }
  });

  it("blocks EVERY pair that is not in the valid set (exhaustive)", () => {
    for (const from of DEFECT_STATUSES) {
      for (const to of DEFECT_STATUSES) {
        const shouldBeValid = VALID.some(([f, t]) => f === from && t === to);
        expect(canTransition(from, to), `${from} → ${to}`).toBe(shouldBeValid);
      }
    }
  });

  it("terminal statuses have no way out", () => {
    expect(allowedTransitions("устранён")).toEqual([]);
    expect(allowedTransitions("отклонён")).toEqual([]);
  });

  it("self-transition is not allowed", () => {
    for (const s of DEFECT_STATUSES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });
});

describe("TRANSITIONS map shape", () => {
  it("covers every status as a key (UI derives buttons from it)", () => {
    for (const s of DEFECT_STATUSES) {
      expect(TRANSITIONS[s]).toBeDefined();
    }
  });

  it("allowedTransitions('новый') lists exactly the two spec transitions", () => {
    expect(allowedTransitions("новый")).toEqual(["в ремонте", "отклонён"]);
  });
});
