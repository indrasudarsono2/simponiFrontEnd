// tes.js (ESM)
import { readFile } from "node:fs/promises";

const jsonText = await readFile(new URL("./user1.json", import.meta.url), "utf8");
const json = JSON.parse(jsonText);

console.log(json);