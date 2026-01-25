/**
 * @jlguenego/ai-cli
 * CLI pour orchestrer des agents IA via des backends externes.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Lit la version depuis package.json.
 */
function getPackageVersion(): string {
  const packagePath = join(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
  return pkg.version;
}

export const VERSION = getPackageVersion();
export const NAME = "@jlguenego/ai-cli";
export const CLI_NAME = "jlgcli";
