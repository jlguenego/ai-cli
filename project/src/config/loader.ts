/**
 * Chargement et sauvegarde de la configuration jlgcli
 *
 * Priorité de fusion : projet > utilisateur > défauts
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  type UserConfig,
  type ProjectConfig,
  type ResolvedConfig,
  DEFAULT_CONFIG,
  USER_CONFIG_PATH,
  PROJECT_CONFIG_FILENAME,
  isValidConfig,
} from "./schema.js";

// ============================================================================
// Types d'erreur
// ============================================================================

/**
 * Erreur de configuration (JSON invalide, validation échouée, etc.)
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

// ============================================================================
// Chargement
// ============================================================================

/**
 * Charge la configuration utilisateur depuis USER_CONFIG_PATH
 * @returns Configuration utilisateur (vide si fichier absent)
 * @throws ConfigError si le JSON est invalide ou la validation échoue
 */
export async function loadUserConfig(): Promise<UserConfig> {
  return loadConfigFile(USER_CONFIG_PATH);
}

/**
 * Charge la configuration projet en remontant depuis cwd
 * @param cwd - Répertoire de départ (défaut: process.cwd())
 * @returns Configuration projet (vide si fichier absent)
 * @throws ConfigError si le JSON est invalide ou la validation échoue
 */
export async function loadProjectConfig(cwd?: string): Promise<ProjectConfig> {
  const projectRoot = findProjectRoot(cwd);
  if (projectRoot === null) {
    return {};
  }
  const configPath = join(projectRoot, PROJECT_CONFIG_FILENAME);
  return loadConfigFile(configPath);
}

/**
 * Charge et parse un fichier de configuration JSON
 * @param filePath - Chemin du fichier
 * @returns Configuration parsée (vide si fichier absent)
 * @throws ConfigError si le JSON est invalide ou la validation échoue
 */
async function loadConfigFile(filePath: string): Promise<UserConfig> {
  if (!existsSync(filePath)) {
    return {};
  }

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (error) {
    throw new ConfigError(
      `Impossible de lire le fichier de configuration`,
      filePath,
      error instanceof Error ? error : undefined,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new ConfigError(
      `JSON invalide dans le fichier de configuration`,
      filePath,
      error instanceof Error ? error : undefined,
    );
  }

  if (!isValidConfig(parsed)) {
    throw new ConfigError(
      `Configuration invalide (valeurs incorrectes)`,
      filePath,
    );
  }

  return parsed;
}

// ============================================================================
// Détection racine projet
// ============================================================================

/**
 * Trouve la racine du projet en remontant jusqu'à trouver .jlgcli.json
 * @param cwd - Répertoire de départ (défaut: process.cwd())
 * @returns Chemin de la racine projet ou null si non trouvé
 */
export function findProjectRoot(cwd?: string): string | null {
  let currentDir = cwd ?? process.cwd();

  // Limite de sécurité pour éviter boucle infinie
  const maxDepth = 100;
  let depth = 0;

  while (depth < maxDepth) {
    const configPath = join(currentDir, PROJECT_CONFIG_FILENAME);
    if (existsSync(configPath)) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    // Atteint la racine du système de fichiers
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
    depth++;
  }

  return null;
}

// ============================================================================
// Sauvegarde
// ============================================================================

/**
 * Sauvegarde la configuration utilisateur
 * @param config - Configuration à sauvegarder (partielle ou complète)
 * @throws ConfigError si l'écriture échoue
 */
export async function saveUserConfig(config: UserConfig): Promise<void> {
  const dirPath = dirname(USER_CONFIG_PATH);

  try {
    // Créer le dossier parent si nécessaire (normalement home existe toujours)
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    const content = JSON.stringify(config, null, 2) + "\n";
    await writeFile(USER_CONFIG_PATH, content, "utf-8");
  } catch (error) {
    throw new ConfigError(
      `Impossible d'écrire le fichier de configuration`,
      USER_CONFIG_PATH,
      error instanceof Error ? error : undefined,
    );
  }
}

// ============================================================================
// Fusion
// ============================================================================

/**
 * Résout la configuration finale en fusionnant projet > utilisateur > défauts
 * @param cwd - Répertoire de départ pour la recherche projet (défaut: process.cwd())
 * @returns Configuration résolue avec tous les champs requis
 */
export async function resolveConfig(cwd?: string): Promise<ResolvedConfig> {
  const userConfig = await loadUserConfig();
  const projectConfig = await loadProjectConfig(cwd);

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    ...projectConfig,
  };
}

/**
 * Obtient une valeur de configuration spécifique
 * @param key - Clé de configuration
 * @param cwd - Répertoire de départ pour la recherche projet
 * @returns Valeur de la configuration
 */
export async function getConfigValue<K extends keyof ResolvedConfig>(
  key: K,
  cwd?: string,
): Promise<ResolvedConfig[K]> {
  const config = await resolveConfig(cwd);
  return config[key];
}
