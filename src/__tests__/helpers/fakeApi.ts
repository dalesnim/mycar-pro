import type { DefectApi } from "../../api/client";
import { ApiError } from "../../api/client";
import type { Defect, DefectType } from "../../types/defect";
import { DEFECT_CATALOG } from "../../data/defectCatalog";
import { canTransition } from "../../logic/fsm";

/** In-memory двойник сервера для тестов стора: то же поведение, без сети. */
export function createFakeApi(seed: Defect[] = []) {
  let nextId = 1;
  const defects: Defect[] = seed.map((d) => ({ ...d }));
  const types: DefectType[] = DEFECT_CATALOG.map((t) => ({ ...t }));

  const api: DefectApi = {
    async listDefects(vin) {
      return defects
        .filter((d) => !vin || d.vin === vin)
        .map((d) => ({ ...d }));
    },
    async createDefect(input) {
      if (!input.typeId) {
        throw new ApiError(400, "Ошибка валидации", {
          typeId: "Выберите тип дефекта",
        });
      }
      const defect: Defect = {
        ...input,
        id: `d_${nextId++}`,
        status: "новый",
        createdAt: "2026-07-21T09:00:00.000Z",
      };
      defects.push(defect);
      return { ...defect };
    },
    async updateDefect(id, patch) {
      const defect = defects.find((d) => d.id === id);
      if (!defect) throw new ApiError(404, `Дефект не найден: ${id}`);
      if (patch.status && patch.status !== defect.status) {
        if (!canTransition(defect.status, patch.status)) {
          throw new ApiError(400, "Ошибка валидации", {
            status: "Недопустимый переход",
          });
        }
      }
      Object.assign(defect, patch);
      return { ...defect };
    },
    async deleteDefect(id) {
      const index = defects.findIndex((d) => d.id === id);
      if (index === -1) throw new ApiError(404, `Дефект не найден: ${id}`);
      defects.splice(index, 1);
    },
    async listDefectTypes() {
      return types.map((t) => ({ ...t }));
    },
  };

  return { api, defects };
}
