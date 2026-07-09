<script setup lang="ts">
import CarBodyMap from "./components/CarBodyMap.vue";
import DefectCard from "./components/DefectCard.vue";
import DefectList from "./components/DefectList.vue";
import SummaryPanel from "./components/SummaryPanel.vue";
</script>

<template>
  <main class="app">
    <header class="app-header">
      <div class="logo">QC</div>
      <div>
        <h1>Defect Logger</h1>
        <p class="app-subtitle">ОТК · MyCar Pro Smart Factory</p>
      </div>
    </header>

    <div class="layout">
      <div class="col-map">
        <div class="map-panel">
          <CarBodyMap />
        </div>
        <SummaryPanel />
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
  padding: 20px 24px 48px;
}
.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(160deg, var(--accent), #1e40af);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  display: grid;
  place-items: center;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}
h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: -0.01em;
}
.app-subtitle {
  margin: 1px 0 0;
  color: var(--text-dim);
  font-size: 13px;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 16px;
  align-items: start;
}
.col-map,
.col-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.map-panel {
  background: #f2f5f9;
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
