import type {
  Defect,
  DefectStatus,
  DefectType,
  Severity,
  VinSummary,
} from "../types/defect";

export const API_BASE =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface NewDefectInput {
  vin: string;
  zone: string;
  x: number;
  y: number;
  z: number;
  typeId: string;
  severity: Severity;
  comment: string;
}

export interface DefectPatch {
  zone?: string;
  typeId?: string;
  severity?: Severity;
  comment?: string;
  status?: DefectStatus;
}

export interface DefectApi {
  listDefects(vin?: string): Promise<Defect[]>;
  createDefect(input: NewDefectInput): Promise<Defect>;
  updateDefect(id: string, patch: DefectPatch): Promise<Defect>;
  deleteDefect(id: string): Promise<void>;
  listDefectTypes(): Promise<DefectType[]>;
  listVins(): Promise<VinSummary[]>;
  createVin(vin: string): Promise<void>;
}

/** Ошибка уровня API: сервер ответил 4xx/5xx (в отличие от сетевого сбоя). */
export class ApiError extends Error {
  status: number;
  errors: Record<string, string>;

  constructor(status: number, message: string, errors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `Ошибка сервера (${res.status})`;
    let errors: Record<string, string> = {};
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      if (body?.errors) errors = body.errors;
    } catch {
      // тело не JSON — оставляем сообщение по статусу
    }
    throw new ApiError(res.status, message, errors);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function createHttpApi(): DefectApi {
  return {
    listDefects(vin) {
      const query = vin ? `?vin=${encodeURIComponent(vin)}` : "";
      return request<Defect[]>(`/defects${query}`);
    },
    createDefect(input) {
      return request<Defect>("/defects", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    updateDefect(id, patch) {
      return request<Defect>(`/defects/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    },
    deleteDefect(id) {
      return request<void>(`/defects/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    listDefectTypes() {
      return request<DefectType[]>("/defect-types");
    },
    listVins() {
      return request<VinSummary[]>("/vins");
    },
    async createVin(vin) {
      await request<{ vin: string }>("/vins", {
        method: "POST",
        body: JSON.stringify({ vin }),
      });
    },
  };
}

export function pdiReportUrl(vin: string, format: "html" | "csv" = "html"): string {
  return `${API_BASE}/inspections/${encodeURIComponent(vin)}/pdi-report?format=${format}`;
}
