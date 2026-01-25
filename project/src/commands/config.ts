/**
 * Commande `jlgcli config` — Gestion de la configuration
 */

import { Command } from "commander";
import {
  CONFIG_KEYS,
  VALID_BACKENDS,
  VALID_COMPLETION_MODES,
  isValidConfig,
  type BackendId,
  type CompletionMode,
  type ConfigKey,
  type UserConfig,
} from "../config/schema.js";
import {
  getConfigValue,
  loadUserConfig,
  saveUserConfig,
  ConfigError,
} from "../config/loader.js";

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
 * Parse et valide une valeur de configuration selon la clé.
 * Doit rester une fonction pure (sans I/O).
 */
export function parseConfigValue(
  key: ConfigKey,
  raw: string,
): UserConfig[ConfigKey] {
  switch (key) {
    case "backend": {
      if (!VALID_BACKENDS.includes(raw as BackendId)) {
        throw new Error(`Valeur invalide pour backend: "${raw}"`);
      }
      return raw as BackendId;
    }

    case "completionMode": {
      if (!VALID_COMPLETION_MODES.includes(raw as CompletionMode)) {
        throw new Error(`Valeur invalide pour completionMode: "${raw}"`);
      }
      return raw as CompletionMode;
    }

    case "maxIterations":
    case "timeoutMs":
    case "noProgressLimit": {
      const value = Number(raw);
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw new Error(`Valeur invalide (entier requis): "${raw}"`);
      }

      if ((key === "maxIterations" || key === "timeoutMs") && value <= 0) {
        throw new Error(`${key} doit être > 0`);
      }
      if (key === "noProgressLimit" && value < 0) {
        throw new Error(`noProgressLimit doit être >= 0`);
      }

      return value;
    }
  }
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

  // Sous-commande: config set <key> <value>
  configCmd
    .command("set <key> <value>")
    .description("Définit la valeur d'une clé de configuration")
    .action(async (key: string, value: string) => {
      await handleConfigSet(key, value);
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

/**
 * Handler pour `config set <key> <value>`
 */
export async function handleConfigSet(
  key: string,
  value: string,
): Promise<void> {
  if (!isValidConfigKey(key)) {
    console.error(`Erreur: Clé de configuration invalide: "${key}"`);
    console.error(`Clés valides: ${CONFIG_KEYS.join(", ")}`);
    process.exit(1);
  }

  let parsedValue: UserConfig[ConfigKey];
  try {
    parsedValue = parseConfigValue(key, value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erreur: ${message}`);
    process.exit(1);
  }

  try {
    const currentUserConfig = await loadUserConfig();
    const updatedUserConfig = {
      ...currentUserConfig,
      [key]: parsedValue,
    };

    if (!isValidConfig(updatedUserConfig)) {
      console.error(
        `Erreur: Configuration invalide après mise à jour (clé: "${key}")`,
      );
      process.exit(1);
    }

    await saveUserConfig(updatedUserConfig);
    console.log("OK");
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Erreur de configuration: ${error.message}`);
      console.error(`Fichier: ${error.filePath}`);
      process.exit(1);
    }
    throw error;
  }
}
