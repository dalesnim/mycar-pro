import { ref } from "vue";

export type ToastKind = "ok" | "error" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

const toasts = ref<Toast[]>([]);
let seq = 0;

export function useToasts() {
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function push(kind: ToastKind, text: string) {
    const id = ++seq;
    toasts.value.push({ id, kind, text });
    setTimeout(() => dismiss(id), 4000);
  }

  return { toasts, push, dismiss };
}
