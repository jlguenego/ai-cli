/**
 * Commande `jlgcli config` — Gestion de la configuration
 */

import { Command } from "commander";
import { CONFIG_KEYS, type ConfigKey } from "../config/schema.js";
import { getConfigValue, ConfigError } from "../config/loader.js";

/**
 * Vérifie si une chaîne est une clé de configuration valide
 */
export function isValidConfigKey(key: string): key is ConfigKey {
  return CONFIG_KEYS.includes(key as ConfigKey);
}

/**
 * Formate une valeur de configuration pour l'affichage
 */
export function formatConfigValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Enregistre la commande `config` et ses sous-commandes
 */
export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command("config")
    .description("Gérer la configuration de jlgcli");

  // Sous-commande: config get <key>
  configCmd
    .command("get <key>")
    .description("Affiche la valeur d'une clé de configuration")
    .action(async (key: string) => {
      await handleConfigGet(key);
    });
}

/**
 * Handler pour `config get <key>`
 */
async function handleConfigGet(key: string): Promise<void> {
  // Valider la clé
  if (!isValidConfigKey(key)) {
    console.error(`Erreur: Clé de configuration invalide: "${key}"`);
    console.error(`Clés valides: ${CONFIG_KEYS.join(", ")}`);
    process.exit(1);
  }

  try {
    const value = await getConfigValue(key);
    console.log(formatConfigValue(value));
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Erreur de configuration: ${error.message}`);
      console.error(`Fichier: ${error.filePath}`);
      process.exit(1);
    }
    throw error;
  }
}
