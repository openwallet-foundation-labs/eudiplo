import { config } from "dotenv";
import { resolve } from "path";

// Load test environment variables
config({ path: resolve(__dirname, "../.env"), quiet: true });
