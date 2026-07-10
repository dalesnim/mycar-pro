import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { createStorage } from "../storage.js";

let dir;
let dataFile;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qc-api-"));
  dataFile = join(dir, "data.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const makeApp = () => createApp(createStorage(dataFile));

const validBody = {
  vin: "X1",
  zone: "капот",
  x: 120,
  y: 80,
  typeId: "paint",
  severity: "значительный",
  comment: "скол",
};

async function createDefect(app, overrides = {}) {
  const res = await request(app)
    .post("/defects")
    .send({ ...validBody, ...overrides });
  expect(res.status).toBe(201);
  return res.body;
}

describe("POST /defects (валидация)", () => {
  it("создаёт дефект: id генерирует сервер, статус «новый»", async () => {
    const app = makeApp();
    const created = await createDefect(app);
    expect(created.id).toBe("d_1");
    expect(created.status).toBe("новый");
    expect(created.createdAt).toBeTruthy();

    const list = await request(app).get("/defects?vin=X1");
    expect(list.body).toHaveLength(1);
  });

  it("POST без typeId -> 400, дефект НЕ создан", async () => {
    const app = makeApp();
    const res = await request(app)
      .post("/defects")
      .send({ ...validBody, typeId: undefined });
    expect(res.status).toBe(400);
    expect(res.body.errors.typeId).toBeTruthy();

    const list = await request(app).get("/defects");
    expect(list.body).toHaveLength(0);
  });

  it("POST без zone -> 400, дефект НЕ создан", async () => {
    const app = makeApp();
    const res = await request(app)
      .post("/defects")
      .send({ ...validBody, zone: "  " });
    expect(res.status).toBe(400);
    expect(res.body.errors.zone).toBeTruthy();
  });

  it("POST с неизвестным typeId -> 400", async () => {
    const app = makeApp();
    const res = await request(app)
      .post("/defects")
      .send({ ...validBody, typeId: "no-such-type" });
    expect(res.status).toBe(400);
    expect(res.body.errors.typeId).toBeTruthy();
  });
});

describe("PATCH /defects/:id (FSM на сервере)", () => {
  it("разрешённая цепочка: новый -> в ремонте -> устранён", async () => {
    const app = makeApp();
    const d = await createDefect(app);

    const step1 = await request(app)
      .patch(`/defects/${d.id}`)
      .send({ status: "в ремонте" });
    expect(step1.status).toBe(200);

    const step2 = await request(app)
      .patch(`/defects/${d.id}`)
      .send({ status: "устранён" });
    expect(step2.status).toBe(200);
    expect(step2.body.status).toBe("устранён");
  });

  it("устранён -> новый запрещён (400), статус не меняется", async () => {
    const app = makeApp();
    const d = await createDefect(app);
    await request(app).patch(`/defects/${d.id}`).send({ status: "в ремонте" });
    await request(app).patch(`/defects/${d.id}`).send({ status: "устранён" });

    const res = await request(app)
      .patch(`/defects/${d.id}`)
      .send({ status: "новый" });
    expect(res.status).toBe(400);
    expect(res.body.errors.status).toContain("Недопустимый переход");

    const list = await request(app).get("/defects?vin=X1");
    expect(list.body[0].status).toBe("устранён");
  });

  it("PATCH несуществующего id -> 404", async () => {
    const app = makeApp();
    const res = await request(app)
      .patch("/defects/d_999")
      .send({ comment: "x" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /defects/:id", () => {
  it("удаляет существующий дефект (204)", async () => {
    const app = makeApp();
    const d = await createDefect(app);
    const res = await request(app).delete(`/defects/${d.id}`);
    expect(res.status).toBe(204);
    const list = await request(app).get("/defects");
    expect(list.body).toHaveLength(0);
  });

  it("DELETE несуществующего id -> 404, сервер не падает", async () => {
    const app = makeApp();
    const res = await request(app).delete("/defects/d_999");
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("не найден");

    // сервер жив и отвечает дальше
    const alive = await request(app).get("/defects");
    expect(alive.status).toBe(200);
  });
});

describe("персистентность (данные переживают перезапуск)", () => {
  it("создать дефект, «перезапустить» сервер -> GET возвращает дефект", async () => {
    const first = makeApp();
    const d = await createDefect(first);

    const restarted = makeApp(); // новый инстанс читает тот же файл
    const list = await request(restarted).get("/defects?vin=X1");
    expect(list.status).toBe(200);
    expect(list.body.map((x) => x.id)).toContain(d.id);
  });

  it("нумерация id продолжается после перезапуска (без конфликтов)", async () => {
    const first = makeApp();
    await createDefect(first);

    const restarted = makeApp();
    const d2 = await createDefect(restarted);
    expect(d2.id).toBe("d_2");
  });

  it("файла хранилища нет -> старт с пустым списком, без падения", async () => {
    const app = makeApp();
    const res = await request(app).get("/defects");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("битый файл хранилища -> старт с пустым списком, без падения", async () => {
    writeFileSync(dataFile, "{ это не JSON !!!");
    const app = makeApp();
    const res = await request(app).get("/defects");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("кузова (VIN)", () => {
  it("POST /vins регистрирует чистый кузов; повторно -> 400", async () => {
    const app = makeApp();
    const ok = await request(app).post("/vins").send({ vin: "CLEAN1" });
    expect(ok.status).toBe(201);

    const dup = await request(app).post("/vins").send({ vin: "CLEAN1" });
    expect(dup.status).toBe(400);

    const empty = await request(app).post("/vins").send({});
    expect(empty.status).toBe(400);
  });

  it("GET /vins возвращает сводку по каждому кузову", async () => {
    const app = makeApp();
    await request(app).post("/vins").send({ vin: "CLEAN1" });
    const d = await createDefect(app); // VIN X1
    await request(app).patch(`/defects/${d.id}`).send({ status: "в ремонте" });

    const res = await request(app).get("/vins");
    expect(res.status).toBe(200);
    const byVin = Object.fromEntries(res.body.map((v) => [v.vin, v]));
    expect(byVin.CLEAN1).toMatchObject({ total: 0, open: 0, fit: true });
    expect(byVin.X1).toMatchObject({ total: 1, open: 1, fit: false });
  });

  it("PDI для зарегистрированного чистого кузова -> годен=да", async () => {
    const app = makeApp();
    await request(app).post("/vins").send({ vin: "CLEAN1" });
    const res = await request(app).get("/inspections/CLEAN1/pdi-report?format=csv");
    expect(res.status).toBe(200);
    expect(res.text).toContain("годен=да");
  });
});

describe("история статусов", () => {
  it("PATCH статуса дописывает запись в statusHistory", async () => {
    const app = makeApp();
    const d = await createDefect(app);
    expect(d.statusHistory).toHaveLength(1);
    expect(d.statusHistory[0].to).toBe("новый");

    const res = await request(app)
      .patch(`/defects/${d.id}`)
      .send({ status: "в ремонте" });
    expect(res.body.statusHistory).toHaveLength(2);
    expect(res.body.statusHistory[1]).toMatchObject({
      from: "новый",
      to: "в ремонте",
    });
  });
});

describe("справочник типов", () => {
  it("GET /defect-types возвращает стартовый каталог", async () => {
    const app = makeApp();
    const res = await request(app).get("/defect-types");
    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.id)).toEqual(["paint", "dent", "gap", "chip"]);
  });

  it("POST /defect-types добавляет тип; без name -> 400", async () => {
    const app = makeApp();
    const bad = await request(app).post("/defect-types").send({});
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post("/defect-types")
      .send({ name: "царапина", category: "ЛКП" });
    expect(ok.status).toBe(201);
    expect(ok.body.id).toBe("t_1");

    const list = await request(app).get("/defect-types");
    expect(list.body).toHaveLength(5);
  });
});

describe("отчёт PDI", () => {
  it("3 дефекта: 2 устранено, 1 новый -> всего 3, устранено 2, открыто 1, годен=НЕТ", async () => {
    const app = makeApp();
    const a = await createDefect(app);
    const b = await createDefect(app, { zone: "крыша", typeId: "dent" });
    await createDefect(app, { zone: "багажник", typeId: "chip" });
    for (const d of [a, b]) {
      await request(app).patch(`/defects/${d.id}`).send({ status: "в ремонте" });
      await request(app).patch(`/defects/${d.id}`).send({ status: "устранён" });
    }

    const res = await request(app).get("/inspections/X1/pdi-report?format=csv");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    const text = res.text;
    expect(text).toContain("N;zone;type;severity;status;comment;date");
    expect(text).toContain("годен=нет;всего=3;устранено=2;отклонено=0;открыто=1");
  });

  it("0 дефектов у известного VIN -> пустой список, годен=ДА", async () => {
    const app = makeApp();
    const d = await createDefect(app); // регистрирует VIN X1
    await request(app).delete(`/defects/${d.id}`);

    const res = await request(app).get("/inspections/X1/pdi-report?format=csv");
    expect(res.status).toBe(200);
    expect(res.text).toContain("годен=да;всего=0;устранено=0;отклонено=0;открыто=0");
  });

  it("HTML-версия открывается и содержит вердикт", async () => {
    const app = makeApp();
    await createDefect(app);
    const res = await request(app).get("/inspections/X1/pdi-report");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("НЕ ГОДЕН К ВЫДАЧЕ");
    expect(res.text).toContain("Отчёт PDI");
  });

  it("VIN не найден -> понятная ошибка 404, а не пустой файл", async () => {
    const app = makeApp();
    const res = await request(app).get(
      "/inspections/NOPE/pdi-report?format=csv",
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("VIN не найден");
  });
});
