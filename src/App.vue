<script setup lang="ts">
import { computed, ref } from "vue";
import GarageSidebar, { type AppView } from "./components/GarageSidebar.vue";
import InspectView from "./components/InspectView.vue";
import JournalView from "./components/JournalView.vue";
import AnalyticsView from "./components/AnalyticsView.vue";
import ToastStack from "./components/ToastStack.vue";
import { useDefects } from "./composables/useDefects";
import { pdiReportUrl } from "./api/client";

const store = useDefects();
const { apiError, loading, lastSyncAt, currentVin } = store;

// диплинк: ?view=journal|analytics
const initialView = new URLSearchParams(window.location.search).get("view");
const view = ref<AppView>(
  initialView === "journal" || initialView === "analytics"
    ? initialView
    : "inspect",
);

const VIEW_TITLES: Record<AppView, string> = {
  inspect: "Осмотр кузова",
  journal: "Журнал дефектов",
  analytics: "Аналитика ОТК",
};

const syncLabel = computed(() =>
  lastSyncAt.value
    ? lastSyncAt.value.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—",
);

function openDefect(vin: string, id: string) {
  currentVin.value = vin;
  store.selectDefect(id);
  view.value = "inspect";
}
</script>

<template>
  <div class="shell">
    <GarageSidebar v-model:view="view" />

    <main class="content">
      <header class="topbar">
        <h1 class="view-title">{{ VIEW_TITLES[view] }}</h1>

        <div class="top-actions">
          <div
            class="conn"
            :class="apiError ? 'conn-off' : 'conn-on'"
            :title="`последняя синхронизация: ${syncLabel}`"
          >
            <span class="conn-dot"></span>
            {{ apiError ? "нет связи" : loading ? "синхронизация…" : `синхр. ${syncLabel}` }}
          </div>
          <a
            class="top-btn top-btn-primary"
            :href="pdiReportUrl(currentVin, 'html')"
            target="_blank"
            rel="noopener"
          >
            Отчёт PDI
          </a>
          <a class="top-btn" :href="pdiReportUrl(currentVin, 'csv')">CSV</a>
        </div>
      </header>

      <div v-if="apiError" class="api-banner">
        <span>⚠ {{ apiError }}</span>
        <button type="button" class="retry-btn" @click="store.refresh()">
          Повторить
        </button>
      </div>

      <InspectView v-if="view === 'inspect'" />
      <JournalView v-else-if="view === 'journal'" @open="openDefect" />
      <AnalyticsView v-else />
    </main>

    <ToastStack />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}
.content {
  flex: 1;
  min-width: 0;
  padding: 16px 22px 48px;
  max-width: 1360px;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.view-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.09em;
}
.top-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.conn {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  color: var(--text-dim);
  white-space: nowrap;
}
.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.conn-on .conn-dot {
  background: var(--signal-fixed);
}
.conn-off {
  color: var(--bad-ink);
  border-color: var(--bad-border);
  background: var(--bad-bg);
}
.conn-off .conn-dot {
  background: var(--signal-new);
}
.top-btn {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  background: var(--btn-bg);
  color: var(--text);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.12s;
  white-space: nowrap;
}
.top-btn:hover {
  background: var(--btn-hover);
}
.top-btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.top-btn-primary:hover {
  background: var(--accent-hover);
}
.api-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 10px 16px;
  border: 1px solid var(--warn-border);
  border-radius: var(--radius);
  background: var(--warn-bg);
  color: var(--warn-ink);
  font-size: 14px;
}
.retry-btn {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 5px 14px;
  border: 1px solid var(--warn-border);
  border-radius: var(--radius);
  background: var(--panel-bg);
  color: var(--warn-ink);
  cursor: pointer;
  white-space: nowrap;
}
@media (max-width: 900px) {
  .shell {
    flex-direction: column;
  }
}
</style>
