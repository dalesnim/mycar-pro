<script setup lang="ts">
import CarBodyMap from "./components/CarBodyMap.vue";
import DefectCard from "./components/DefectCard.vue";
import DefectList from "./components/DefectList.vue";
import SummaryPanel from "./components/SummaryPanel.vue";
import { useDefects } from "./composables/useDefects";

const store = useDefects();
const { apiError, loading } = store;
</script>

<template>
  <main class="app">
    <header class="app-header">
      <div class="logo">QC</div>
      <div class="brand">
        <h1>Defect Logger</h1>
        <p class="app-subtitle">ОТК · MyCar Pro Smart Factory</p>
      </div>
      <div class="conn" :class="apiError ? 'conn-off' : 'conn-on'">
        <span class="conn-dot"></span>
        {{ apiError ? "нет связи с сервером" : loading ? "синхронизация…" : "данные с сервера" }}
      </div>
    </header>

    <div v-if="apiError" class="api-banner">
      <span>⚠ {{ apiError }}</span>
      <button type="button" class="retry-btn" @click="store.refresh()">
        Повторить
      </button>
    </div>

    <SummaryPanel />

    <div class="layout">
      <div class="col-map">
        <div class="map-panel">
          <CarBodyMap />
        </div>
      </div>
      <div class="col-side">
        <DefectCard />
        <DefectList />
      </div>
    </div>
  </main>
</template>

<style scoped>
.app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 18px 24px 48px;
}
.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.logo {
  width: 38px;
  height: 38px;
  border: 2px solid var(--ink);
  border-radius: 4px;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
  display: grid;
  place-items: center;
  background: var(--panel-bg);
}
h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.app-subtitle {
  margin: 0;
  color: var(--text-dim);
  font-size: 12px;
  letter-spacing: 0.02em;
}
.conn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  color: var(--text-dim);
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
  color: #c0353a;
  border-color: #f0a9ac;
  background: #fdf1f1;
}
.conn-off .conn-dot {
  background: var(--signal-new);
}
.api-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 10px 16px;
  border: 1px solid #f0c8a0;
  border-radius: var(--radius);
  background: #fdf6ec;
  color: #8a5a1e;
  font-size: 14px;
}
.retry-btn {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 5px 14px;
  border: 1px solid #d9b17c;
  border-radius: var(--radius);
  background: #fff;
  color: #8a5a1e;
  cursor: pointer;
  white-space: nowrap;
}
.retry-btn:hover {
  background: #faf0e0;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 14px;
  align-items: start;
  margin-top: 14px;
}
.col-map,
.col-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.map-panel {
  background: var(--stage);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-panel);
  padding: 0;
  overflow: hidden;
}
@media (max-width: 980px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
