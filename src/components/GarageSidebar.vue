<script setup lang="ts">
import { ref } from "vue";
import { useDefects } from "../composables/useDefects";
import { useToasts } from "../composables/useToasts";

export type AppView = "inspect" | "journal" | "analytics";

const view = defineModel<AppView>("view", { required: true });

const store = useDefects();
const { vins, currentVin } = store;
const { push } = useToasts();

const NAV: { key: AppView; label: string }[] = [
  { key: "inspect", label: "Осмотр" },
  { key: "journal", label: "Журнал" },
  { key: "analytics", label: "Аналитика" },
];

const newVin = ref("");
const vinError = ref("");
const adding = ref(false);

function pickVin(vin: string) {
  currentVin.value = vin;
  view.value = "inspect";
}

async function onAddVin() {
  const err = await store.addVin(newVin.value);
  vinError.value = err;
  if (!err) {
    push("ok", `Кузов ${currentVin.value} зарегистрирован`);
    newVin.value = "";
    adding.value = false;
    view.value = "inspect";
  }
}
</script>

<template>
  <aside class="rail">
    <div class="brand">
      <div class="logo">QC</div>
      <div>
        <p class="brand-name">Defect Logger</p>
        <p class="brand-sub">ОТК · MyCar Pro</p>
      </div>
    </div>

    <nav class="nav" aria-label="Разделы">
      <button
        v-for="item in NAV"
        :key="item.key"
        type="button"
        class="nav-btn"
        :class="{ active: view === item.key }"
        @click="view = item.key"
      >
        {{ item.label }}
      </button>
    </nav>

    <div class="garage">
      <p class="garage-title">Кузова · {{ vins.length }}</p>
      <ul class="cars">
        <li v-for="v in vins" :key="v.vin">
          <button
            type="button"
            class="car"
            :class="{ active: v.vin === currentVin }"
            @click="pickVin(v.vin)"
          >
            <span
              class="car-lamp"
              :class="v.fit ? 'lamp-fit' : 'lamp-unfit'"
              :title="v.fit ? 'годен к выдаче' : 'не годен: есть открытые дефекты'"
            ></span>
            <span class="car-vin">{{ v.vin }}</span>
            <span class="car-count" :title="`открыто ${v.open} из ${v.total}`">
              {{ v.open }}/{{ v.total }}
            </span>
          </button>
        </li>
      </ul>

      <form v-if="adding" class="add-form" @submit.prevent="onAddVin">
        <input
          v-model="newVin"
          placeholder="Новый VIN"
          spellcheck="false"
          aria-label="Новый VIN"
        />
        <p v-if="vinError" class="add-error">{{ vinError }}</p>
        <div class="add-actions">
          <button type="submit" class="add-save">Добавить</button>
          <button type="button" class="add-cancel" @click="adding = false; vinError = ''">
            Отмена
          </button>
        </div>
      </form>
      <button v-else type="button" class="add-btn" @click="adding = true">
        + Новый кузов
      </button>
    </div>

    <p class="rail-footer">Next-Gen QMS · контур ОТК</p>
  </aside>
</template>

<style scoped>
.rail {
  width: 232px;
  flex: none;
  background: var(--rail-bg);
  border-right: 1px solid var(--rail-border);
  color: var(--rail-ink);
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
  gap: 20px;
  min-height: 100vh;
  position: sticky;
  top: 0;
  align-self: flex-start;
  max-height: 100vh;
  overflow-y: auto;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  width: 34px;
  height: 34px;
  border: 2px solid var(--rail-ink);
  border-radius: 4px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  display: grid;
  place-items: center;
}
.brand-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.brand-sub {
  margin: 0;
  font-size: 11px;
  color: var(--rail-dim);
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-btn {
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  padding: 8px 10px;
  border: none;
  border-left: 3px solid transparent;
  border-radius: 0 4px 4px 0;
  background: none;
  color: var(--rail-dim);
  cursor: pointer;
}
.nav-btn:hover {
  color: var(--rail-ink);
  background: rgba(255, 255, 255, 0.05);
}
.nav-btn.active {
  color: var(--rail-ink);
  border-left-color: var(--accent);
  background: rgba(255, 255, 255, 0.07);
}
.garage {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.garage-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--rail-dim);
}
.cars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
}
.car {
  font: inherit;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: none;
  color: var(--rail-ink);
  cursor: pointer;
}
.car:hover {
  background: rgba(255, 255, 255, 0.05);
}
.car.active {
  background: rgba(255, 255, 255, 0.09);
  border-color: var(--rail-border);
}
.car-lamp {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.lamp-fit {
  background: var(--signal-fixed);
}
.lamp-unfit {
  background: var(--signal-new);
}
.car-vin {
  font-family: var(--font-mono);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: left;
}
.car-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--rail-dim);
}
.add-btn {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 10px;
  border: 1px dashed var(--rail-border);
  border-radius: 4px;
  background: none;
  color: var(--rail-dim);
  cursor: pointer;
}
.add-btn:hover {
  color: var(--rail-ink);
  border-color: var(--rail-dim);
}
.add-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.add-form input {
  font-family: var(--font-mono);
  font-size: 12px;
  text-transform: uppercase;
  padding: 7px 9px;
  border: 1px solid var(--rail-border);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.25);
  color: var(--rail-ink);
}
.add-error {
  margin: 0;
  font-size: 11px;
  color: #f27d81;
}
.add-actions {
  display: flex;
  gap: 6px;
}
.add-save,
.add-cancel {
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.add-save {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #fff;
}
.add-cancel {
  border: 1px solid var(--rail-border);
  background: none;
  color: var(--rail-dim);
}
.rail-footer {
  margin: auto 0 0;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--rail-dim);
}
@media (max-width: 900px) {
  .rail {
    width: 100%;
    min-height: 0;
    max-height: none;
    position: static;
    border-right: none;
    border-bottom: 1px solid var(--rail-border);
  }
}
</style>
