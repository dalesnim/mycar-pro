import { describe, expect, it } from "vitest";
import { validateDraft, type DraftFields } from "../logic/validation";

function validFields(overrides: Partial<DraftFields> = {}): DraftFields {
  return {
    typeId: "dent",
    zone: "капот",
    severity: "незначительный",
    comment: "",
    ...overrides,
  };
}

describe("validateDraft", () => {
  it("passes with type and zone present", () => {
    const res = validateDraft(validFields());
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual({});
  });

  it("fails without a type, with a visible message", () => {
    const res = validateDraft(validFields({ typeId: "" }));
    expect(res.ok).toBe(false);
    expect(res.errors.typeId).toBeTruthy();
  });

  it("fails without a zone, with a visible message", () => {
    const res = validateDraft(validFields({ zone: "" }));
    expect(res.ok).toBe(false);
    expect(res.errors.zone).toBeTruthy();
  });

  it("whitespace-only zone counts as missing", () => {
    const res = validateDraft(validFields({ zone: "   " }));
    expect(res.ok).toBe(false);
    expect(res.errors.zone).toBeTruthy();
  });

  it("fails when both required fields are missing, reporting both", () => {
    const res = validateDraft(validFields({ typeId: "", zone: "" }));
    expect(res.ok).toBe(false);
    expect(res.errors.typeId).toBeTruthy();
    expect(res.errors.zone).toBeTruthy();
  });

  it("rejects a typeId that is not in the catalog", () => {
    const res = validateDraft(validFields({ typeId: "rust" }));
    expect(res.ok).toBe(false);
    expect(res.errors.typeId).toBeTruthy();
  });

  it("comment is optional", () => {
    const res = validateDraft(validFields({ comment: "" }));
    expect(res.ok).toBe(true);
  });
});
