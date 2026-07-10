import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createApp } from "./app.js";
import { createStorage } from "./storage.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataFile = process.env.DATA_FILE ?? join(here, "data.json");
const port = Number(process.env.PORT) || 3001;

const app = createApp(createStorage(dataFile));
app.listen(port, () => {
  console.log(`QC Defect API запущен: http://localhost:${port}`);
  console.log(`Хранилище: ${dataFile}`);
});
