import { describe, expect, it } from "vitest";
import { createDefectStore } from "../composables/useDefects";

function addValidDefect(
  store: ReturnType<typeof createDefectStore>,
  x = 150,
  y = 200,
  zone = "капот",
) {
  store.startDraft(x, y, zone, 0);
  const res = store.saveDraft({
    typeId: "dent",
    zone,
    severity: "незначительный",
    comment: "",
  });
  expect(res.ok).toBe(true);
  return store.defects.value[store.defects.value.length - 1]!;
}

describe("defect store", () => {
  it("invalid save (missing type) does NOT add a defect", () => {
    const store = createDefectStore();
    store.startDraft(100, 100, "капот", 0);
    const res = store.saveDraft({
      typeId: "",
      zone: "капот",
      severity: "незначительный",
      comment: "",
    });
    expect(res.ok).toBe(false);
    expect(res.errors.typeId).toBeTruthy();
    expect(store.defects.value).toHaveLength(0);
    expect(store.draft.value).not.toBeNull();
  });

  it("valid save adds a defect with vin, coords, and status 'новый'", () => {
    const store = createDefectStore();
    const d = addValidDefect(store, 321.5, 88);
    expect(d.status).toBe("новый");
    expect(d.x).toBe(321.5);
    expect(d.y).toBe(88);
    expect(d.vin).toBe(store.currentVin.value);
    expect(store.draft.value).toBeNull();
    expect(store.selectedId.value).toBe(d.id);
  });

  it("delete removes the defect from the ONE array markers render from", () => {
    const store = createDefectStore();
    const a = addValidDefect(store);
    const b = addValidDefect(store, 500, 260, "крыша");

    store.deleteDefect(a.id);

    const visibleIds = store.visibleDefects.value.map((d) => d.id);
    expect(visibleIds).toEqual([b.id]);
    expect(store.defects.value).toHaveLength(1);
  });

  it("deleting the selected defect clears the selection", () => {
    const store = createDefectStore();
    const d = addValidDefect(store);
    store.selectDefect(d.id);
    store.deleteDefect(d.id);
    expect(store.selectedId.value).toBeNull();
    expect(store.selectedDefect.value).toBeNull();
  });

  it("changeStatus follows the FSM and rejects illegal jumps", () => {
    const store = createDefectStore();
    const d = addValidDefect(store);

    expect(store.changeStatus(d.id, "устранён")).toBe(false);
    expect(d.status).toBe("новый");

    expect(store.changeStatus(d.id, "в ремонте")).toBe(true);
    expect(store.changeStatus(d.id, "устранён")).toBe(true);

    expect(store.changeStatus(d.id, "новый")).toBe(false);
    expect(d.status).toBe("устранён");
  });

  it("summary recalculates on add, status change, and delete", () => {
    const store = createDefectStore();
    expect(store.summary.value["новый"]).toBe(0);

    const a = addValidDefect(store);
    const b = addValidDefect(store, 700, 300, "багажник");
    expect(store.summary.value["новый"]).toBe(2);

    store.changeStatus(a.id, "в ремонте");
    expect(store.summary.value["новый"]).toBe(1);
    expect(store.summary.value["в ремонте"]).toBe(1);

    store.deleteDefect(b.id);
    expect(store.summary.value["новый"]).toBe(0);
  });

  it("filters narrow visibleDefects by type and status", () => {
    const store = createDefectStore();
    const a = addValidDefect(store);
    store.startDraft(600, 250, "крыша", 0);
    store.saveDraft({
      typeId: "paint",
      zone: "крыша",
      severity: "значительный",
      comment: "",
    });
    store.changeStatus(store.defects.value[1]!.id, "в ремонте");

    store.filterTypeId.value = "dent";
    expect(store.visibleDefects.value.map((d) => d.id)).toEqual([a.id]);

    store.filterTypeId.value = "";
    store.filterStatus.value = "в ремонте";
    expect(store.visibleDefects.value).toHaveLength(1);
    expect(store.visibleDefects.value[0]!.typeId).toBe("paint");
  });

  it("summary is scoped to the current VIN (per body)", () => {
    const store = createDefectStore();
    addValidDefect(store);
    store.currentVin.value = "ANOTHER-BODY";
    expect(store.summary.value["новый"]).toBe(0);
    expect(store.bodyDefects.value).toHaveLength(0);
  });
});
