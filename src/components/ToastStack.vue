<script setup lang="ts">
import { useToasts } from "../composables/useToasts";

const { toasts, dismiss } = useToasts();
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast-${t.kind}`"
        @click="dismiss(t.id)"
      >
        <span class="toast-mark">{{ t.kind === "ok" ? "✓" : t.kind === "error" ? "✗" : "ℹ" }}</span>
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: 18px;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 50;
}
.toast {
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: 340px;
  padding: 10px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  color: var(--text);
  font-size: 13px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  cursor: pointer;
}
.toast-mark {
  font-weight: 700;
  flex: none;
}
.toast-ok .toast-mark {
  color: var(--signal-fixed);
}
.toast-error .toast-mark {
  color: var(--signal-new);
}
.toast-info .toast-mark {
  color: var(--accent);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
