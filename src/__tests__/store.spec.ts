import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { createDefectStore } from "../composables/useDefects";
import { createFakeApi } from "./helpers/fakeApi";

function makeStore(seed = createFakeApi()) {
  return createDefectStore(seed.api);
}

async function addValidDefect(
  store: ReturnType<typeof createDefectStore>,
  x = 150,
  y = 200,
  zone = "капот",
) {
  store.startDraft(x, y, zone, 0);
  const res = await store.saveDraft({
    typeId: "dent",
    zone,
    severity: "незначительный",
    comment: "",
  });
  expect(res.ok).toBe(true);
  return store.defects.value[store.defects.value.length - 1]!;
}

describe("defect store (через API)", () => {
  it("invalid save (missing type) does NOT add a defect", async () => {
    const store = makeStore();
    store.startDraft(100, 100, "капот", 0);
    const res = await store.saveDraft({
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

  it("valid save adds a defect with server id, vin, coords, status 'новый'", async () => {
    const store = makeStore();
    const d = await addValidDefect(store, 321.5, 88);
    expect(d.id).toBe("d_1"); // id генерирует сервер, не фронт
    expect(d.status).toBe("новый");
    expect(d.x).toBe(321.5);
    expect(d.y).toBe(88);
    expect(d.vin).toBe(store.currentVin.value);
    expect(store.draft.value).toBeNull();
    expect(store.selectedId.value).toBe(d.id);
  });

  it("refresh loads defects of the current VIN from the API", async () => {
    const fake = createFakeApi();
    const storeA = createDefectStore(fake.api);
    await addValidDefect(storeA);

    // «другая вкладка / перезапуск фронта» — тот же сервер, новый стор
    const storeB = createDefectStore(fake.api);
    expect(storeB.defects.value).toHaveLength(0);
    await storeB.refresh();
    expect(storeB.defects.value).toHaveLength(1);
    expect(storeB.defects.value[0]!.id).toBe("d_1");
  });

  it("server-side rejection (400) surfaces as field errors on the form", async () => {
    const fake = createFakeApi();
    const strictApi = {
      ...fake.api,
      // сервер строже клиента: отвергает то, что клиентская валидация пропустила
      async createDefect() {
        throw new ApiError(400, "Ошибка валидации", {
          zone: "Неизвестная зона кузова",
        });
      },
    };
    const store = createDefectStore(strictApi);
    store.startDraft(1, 1, "капот", 0);
    const res = await store.saveDraft({
      typeId: "dent",
      zone: "капот",
      severity: "незначительный",
      comment: "",
    });
    expect(res.ok).toBe(false);
    expect(res.errors.zone).toBe("Неизвестная зона кузова");
    expect(store.defects.value).toHaveLength(0);
  });

  it("delete removes the defect on the server and locally", async () => {
    const fake = createFakeApi();
    const store = createDefectStore(fake.api);
    const a = await addValidDefect(store);
    const b = await addValidDefect(store, 500, 260, "крыша");

    await store.deleteDefect(a.id);

    expect(store.visibleDefects.value.map((d) => d.id)).toEqual([b.id]);
    expect(fake.defects).toHaveLength(1); // и на «сервере» тоже
  });

  it("deleting the selected defect clears the selection", async () => {
    const store = makeStore();
    const d = await addValidDefect(store);
    store.selectDefect(d.id);
    await store.deleteDefect(d.id);
    expect(store.selectedId.value).toBeNull();
    expect(store.selectedDefect.value).toBeNull();
  });

  it("changeStatus follows the FSM and rejects illegal jumps", async () => {
    const store = makeStore();
    const d = await addValidDefect(store);

    expect(await store.changeStatus(d.id, "устранён")).toBe(false);
    expect(d.status).toBe("новый");

    expect(await store.changeStatus(d.id, "в ремонте")).toBe(true);
    expect(await store.changeStatus(d.id, "устранён")).toBe(true);

    expect(await store.changeStatus(d.id, "новый")).toBe(false);
    expect(d.status).toBe("устранён");
  });

  it("summary recalculates on add, status change, and delete", async () => {
    const store = makeStore();
    expect(store.summary.value["новый"]).toBe(0);

    const a = await addValidDefect(store);
    const b = await addValidDefect(store, 700, 300, "багажник");
    expect(store.summary.value["новый"]).toBe(2);

    await store.changeStatus(a.id, "в ремонте");
    expect(store.summary.value["новый"]).toBe(1);
    expect(store.summary.value["в ремонте"]).toBe(1);

    await store.deleteDefect(b.id);
    expect(store.summary.value["новый"]).toBe(0);
  });

  it("filters narrow visibleDefects by type and status", async () => {
    const store = makeStore();
    const a = await addValidDefect(store);
    store.startDraft(600, 250, "крыша", 0);
    await store.saveDraft({
      typeId: "paint",
      zone: "крыша",
      severity: "значительный",
      comment: "",
    });
    await store.changeStatus(store.defects.value[1]!.id, "в ремонте");

    store.filterTypeId.value = "dent";
    expect(store.visibleDefects.value.map((d) => d.id)).toEqual([a.id]);

    store.filterTypeId.value = "";
    store.filterStatus.value = "в ремонте";
    expect(store.visibleDefects.value).toHaveLength(1);
    expect(store.visibleDefects.value[0]!.typeId).toBe("paint");
  });

  it("summary is scoped to the current VIN (per body)", async () => {
    const store = makeStore();
    await addValidDefect(store);
    store.currentVin.value = "ANOTHER-BODY";
    await store.refresh();
    expect(store.summary.value["новый"]).toBe(0);
    expect(store.bodyDefects.value).toHaveLength(0);
  });

  it("transport failure surfaces apiError and keeps the app alive", async () => {
    const store = createDefectStore({
      async listDefects() {
        throw new TypeError("fetch failed");
      },
      async createDefect() {
        throw new TypeError("fetch failed");
      },
      async updateDefect() {
        throw new TypeError("fetch failed");
      },
      async deleteDefect() {
        throw new TypeError("fetch failed");
      },
      async listDefectTypes() {
        throw new TypeError("fetch failed");
      },
      async listVins() {
        throw new TypeError("fetch failed");
      },
      async createVin() {
        throw new TypeError("fetch failed");
      },
    });
    await store.refresh();
    expect(store.apiError.value).toContain("Сервер недоступен");
    expect(store.defects.value).toEqual([]);
  });
});
