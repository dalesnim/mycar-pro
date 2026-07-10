import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const DEFAULT_DEFECT_TYPES = [
  { id: "paint", name: "окраска", category: "ЛКП" },
  { id: "dent", name: "вмятина", category: "кузов" },
  { id: "gap", name: "зазор", category: "геометрия" },
  { id: "chip", name: "скол", category: "ЛКП" },
];

export function defaultData() {
  return {
    vins: [],
    defects: [],
    defectTypes: DEFAULT_DEFECT_TYPES.map((t) => ({ ...t })),
    nextDefectId: 1,
    nextTypeId: 1,
  };
}

function maxNumericSuffix(items, prefix) {
  let max = 0;
  for (const item of items) {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(item.id ?? "");
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max;
}

// Битый/неполный файл не должен ронять сервер — недостающее заменяем дефолтами.
function normalize(parsed) {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return defaultData();
  }
  const data = defaultData();
  if (Array.isArray(parsed.defects)) data.defects = parsed.defects;
  if (Array.isArray(parsed.defectTypes) && parsed.defectTypes.length > 0) {
    data.defectTypes = parsed.defectTypes;
  }
  if (Array.isArray(parsed.vins)) data.vins = parsed.vins;
  data.nextDefectId = Math.max(
    Number(parsed.nextDefectId) || 1,
    maxNumericSuffix(data.defects, "d_") + 1,
  );
  data.nextTypeId = Math.max(
    Number(parsed.nextTypeId) || 1,
    maxNumericSuffix(data.defectTypes, "t_") + 1,
  );
  return data;
}

export function createStorage(filePath) {
  return {
    filePath,
    load() {
      if (!existsSync(filePath)) {
        const data = defaultData();
        this.save(data);
        return data;
      }
      try {
        return normalize(JSON.parse(readFileSync(filePath, "utf8")));
      } catch {
        return defaultData();
      }
    },
    save(data) {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
    },
  };
}
