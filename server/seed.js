// Демо-данные для защиты: кузов с дефектами в разных статусах (npm run seed).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createStorage, defaultData } from "./storage.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataFile = process.env.DATA_FILE ?? join(here, "data.json");

const DEMO_VIN = "Z94C241BBLR000001";
const day = (d) => `2026-07-${String(d).padStart(2, "0")}T09:30:00.000Z`;

const defect = (n, fields) => ({
  id: `d_${n}`,
  vin: DEMO_VIN,
  x: 0,
  y: 0,
  z: 0,
  comment: "",
  createdAt: day(20 + n),
  ...fields,
});

const data = defaultData();
data.vins = [DEMO_VIN, "X1"];
// Координаты лежат на поверхностях 3D-модели (см. buildCar в CarBodyMap.vue):
// капот — верх y≈1.04, x∈[0.83..2.07]; двери — внешняя плоскость z≈0.93;
// крыша — верх y≈1.56; багажник — верх y≈1.04, x∈[-2.15..-1.15].
data.defects = [
  defect(1, {
    zone: "капот",
    x: 1.5, y: 1.075, z: 0.3,
    typeId: "chip",
    severity: "значительный",
    status: "устранён",
    comment: "скол до грунта, перекрашено",
  }),
  defect(2, {
    zone: "дверь передняя правая",
    x: 0.55, y: 0.66, z: 0.965,
    typeId: "dent",
    severity: "незначительный",
    status: "в ремонте",
    comment: "вмятина без повреждения ЛКП",
  }),
  defect(3, {
    zone: "крыша",
    x: -0.15, y: 1.595, z: 0.15,
    typeId: "paint",
    severity: "критический",
    status: "новый",
    comment: "подтёк лака",
  }),
  defect(4, {
    zone: "багажник",
    x: -1.7, y: 1.075, z: -0.25,
    typeId: "gap",
    severity: "значительный",
    status: "отклонён",
    comment: "зазор в допуске, не дефект",
  }),
];
data.nextDefectId = data.defects.length + 1;

createStorage(dataFile).save(data);
console.log(`Демо-данные записаны: ${dataFile}`);
console.log(`VIN ${DEMO_VIN}: ${data.defects.length} дефекта (устранён, в ремонте, новый, отклонён)`);
console.log(`VIN X1: без дефектов (для примера «годен=ДА»)`);
