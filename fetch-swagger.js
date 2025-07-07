// fetch-swagger.js
import { writeFileSync } from 'fs';
import fetch from 'node-fetch';

const SWAGGER_URL = 'http://localhost:3001/api-json';
const OUTPUT_FILE = 'swagger.json';

async function downloadSwagger() {
  const res = await fetch(SWAGGER_URL);
  if (!res.ok) throw new Error(`Failed to fetch Swagger: ${res.statusText}`);
  const json = await res.json();
  writeFileSync(OUTPUT_FILE, JSON.stringify(json, null, 2));
  console.log(`Swagger spec saved to ${OUTPUT_FILE}`);
}

downloadSwagger().catch(console.error);
