import express from "express";
import cors from "cors";
import { canTransition, SEVERITIES, TRANSITIONS } from "./fsm.js";
import { buildPdiReport, renderPdiCsv, renderPdiHtml } from "./pdi.js";

function validateDefectFields(body, defectTypes, { partial = false } = {}) {
  const errors = {};

  if (!partial && (typeof body.vin !== "string" || !body.vin.trim())) {
    errors.vin = "Укажите VIN кузова";
  }

  if ("typeId" in body || !partial) {
    if (typeof body.typeId !== "string" || !body.typeId) {
      errors.typeId = "Выберите тип дефекта";
    } else if (!defectTypes.some((t) => t.id === body.typeId)) {
      errors.typeId = "Неизвестный тип дефекта";
    }
  }

  if ("zone" in body || !partial) {
    if (typeof body.zone !== "string" || !body.zone.trim()) {
      errors.zone = "Укажите зону кузова";
    }
  }

  if ("severity" in body && !SEVERITIES.includes(body.severity)) {
    errors.severity = `Серьёзность должна быть одной из: ${SEVERITIES.join(", ")}`;
  }

  return errors;
}

export function createApp(storage) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const db = storage.load();
  const persist = () => storage.save(db);
  const findDefect = (id) => db.defects.find((d) => d.id === id);

  // --- Дефекты -----------------------------------------------------------

  app.get("/defects", (req, res) => {
    const vin = typeof req.query.vin === "string" ? req.query.vin : "";
    res.json(vin ? db.defects.filter((d) => d.vin === vin) : db.defects);
  });

  app.post("/defects", (req, res) => {
    const body = req.body ?? {};
    const errors = validateDefectFields(body, db.defectTypes);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Ошибка валидации", errors });
    }
    const defect = {
      id: `d_${db.nextDefectId++}`,
      vin: body.vin.trim(),
      zone: body.zone.trim(),
      x: Number(body.x) || 0,
      y: Number(body.y) || 0,
      z: Number(body.z) || 0,
      typeId: body.typeId,
      severity: SEVERITIES.includes(body.severity)
        ? body.severity
        : SEVERITIES[0],
      status: "новый",
      comment: typeof body.comment === "string" ? body.comment : "",
      createdAt: new Date().toISOString(),
    };
    db.defects.push(defect);
    if (!db.vins.includes(defect.vin)) db.vins.push(defect.vin);
    persist();
    res.status(201).json(defect);
  });

  app.patch("/defects/:id", (req, res) => {
    const defect = findDefect(req.params.id);
    if (!defect) {
      return res.status(404).json({ error: `Дефект не найден: ${req.params.id}` });
    }
    const body = req.body ?? {};

    const errors = validateDefectFields(body, db.defectTypes, { partial: true });
    if ("status" in body && body.status !== defect.status) {
      if (!canTransition(defect.status, body.status)) {
        errors.status =
          `Недопустимый переход статуса: «${defect.status}» → «${body.status}». ` +
          `Разрешено: ${TRANSITIONS[defect.status]?.join(", ") || "нет (статус финальный)"}`;
      }
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Ошибка валидации", errors });
    }

    if ("zone" in body) defect.zone = body.zone.trim();
    if ("typeId" in body) defect.typeId = body.typeId;
    if ("severity" in body) defect.severity = body.severity;
    if ("comment" in body && typeof body.comment === "string") {
      defect.comment = body.comment;
    }
    if ("status" in body) defect.status = body.status;
    persist();
    res.json(defect);
  });

  app.delete("/defects/:id", (req, res) => {
    const index = db.defects.findIndex((d) => d.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: `Дефект не найден: ${req.params.id}` });
    }
    db.defects.splice(index, 1);
    persist();
    res.status(204).end();
  });

  // --- Справочник типов ---------------------------------------------------

  app.get("/defect-types", (_req, res) => {
    res.json(db.defectTypes);
  });

  app.post("/defect-types", (req, res) => {
    const body = req.body ?? {};
    const errors = {};
    if (typeof body.name !== "string" || !body.name.trim()) {
      errors.name = "Укажите название типа";
    }
    const customId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : "";
    const id = customId || `t_${db.nextTypeId}`;
    if (db.defectTypes.some((t) => t.id === id)) {
      errors.id = `Тип с id «${id}» уже существует`;
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Ошибка валидации", errors });
    }
    if (!customId) db.nextTypeId++;
    const type = {
      id,
      name: body.name.trim(),
      category: typeof body.category === "string" ? body.category.trim() : "прочее",
    };
    db.defectTypes.push(type);
    persist();
    res.status(201).json(type);
  });

  // --- Отчёт PDI ----------------------------------------------------------

  app.get("/inspections/:vin/pdi-report", (req, res) => {
    const vin = req.params.vin;
    const format = req.query.format === "csv" ? "csv" : "html";
    const known =
      db.vins.includes(vin) || db.defects.some((d) => d.vin === vin);
    if (!known) {
      const message = `VIN не найден: ${vin}. Кузов не зарегистрирован в системе ОТК.`;
      if (format === "html") {
        return res
          .status(404)
          .type("html")
          .send(`<!doctype html><html lang="ru"><meta charset="utf-8"><title>VIN не найден</title><body style="font-family:system-ui;margin:40px"><h1>Отчёт PDI недоступен</h1><p>${message}</p></body></html>`);
      }
      return res.status(404).json({ error: message });
    }

    const report = buildPdiReport(
      vin,
      db.defects.filter((d) => d.vin === vin),
      db.defectTypes,
    );
    if (format === "csv") {
      res
        .type("text/csv; charset=utf-8")
        .set("Content-Disposition", `attachment; filename="pdi_${encodeURIComponent(vin)}.csv"`)
        .send(renderPdiCsv(report));
    } else {
      res.type("html").send(renderPdiHtml(report));
    }
  });

  return app;
}
