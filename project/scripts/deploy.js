#!/usr/bin/env node
/**
 * Script de déploiement pour @jlguenego/ai-cli
 *
 * Usage:
 *   node scripts/deploy.js [--dry-run]
 *
 * Options:
 *   --dry-run  Simule le déploiement sans publier réellement
 *
 * Étapes:
 *   1. Vérifie la branche (main uniquement)
 *   2. Exécute les tests
 *   3. Build TypeScript
 *   4. Vérifie la version (pas déjà publiée)
 *   5. Publie sur npm
 *   6. Crée un tag Git
 *   7. Met à jour CHANGELOG.md
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// Configuration
const ALLOWED_BRANCH = "main";
const NPM_REGISTRY = "https://registry.npmjs.org";

// Parse arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

// Couleurs pour les messages
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, colors.cyan);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function exec(command, options = {}) {
  const defaultOptions = {
    cwd: projectRoot,
    stdio: "inherit",
    encoding: "utf-8",
  };
  return execSync(command, { ...defaultOptions, ...options });
}

function execSilent(command) {
  return execSync(command, {
    cwd: projectRoot,
    encoding: "utf-8",
  }).trim();
}

function getCurrentBranch() {
  return execSilent("git rev-parse --abbrev-ref HEAD");
}

function hasUncommittedChanges() {
  const status = execSilent("git status --porcelain");
  return status.length > 0;
}

function getPackageJson() {
  const packagePath = join(projectRoot, "package.json");
  return JSON.parse(readFileSync(packagePath, "utf-8"));
}

function getPublishedVersion(packageName) {
  try {
    const result = execSilent(
      `npm view ${packageName} version --registry ${NPM_REGISTRY}`,
    );
    return result;
  } catch {
    // Package not published yet
    return null;
  }
}

function generateChangelog(version) {
  const changelogPath = join(projectRoot, "CHANGELOG.md");
  const date = new Date().toISOString().split("T")[0];

  let changelog = "";

  if (existsSync(changelogPath)) {
    changelog = readFileSync(changelogPath, "utf-8");
  } else {
    changelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

`;
  }

  // Get commits since last tag
  let commits = "";
  try {
    const lastTag = execSilent(
      'git describe --tags --abbrev=0 2>nul || echo ""',
    );
    if (lastTag) {
      commits = execSilent(`git log ${lastTag}..HEAD --oneline --no-merges`);
    } else {
      commits = execSilent("git log --oneline --no-merges -20");
    }
  } catch {
    commits = "";
  }

  // Replace [Unreleased] with new version
  const releaseHeader = `## [${version}] - ${date}`;
  const newUnreleased = "## [Unreleased]\n\n";

  if (changelog.includes("## [Unreleased]")) {
    // Extract content between [Unreleased] and next version
    const unreleasedMatch = changelog.match(
      /## \[Unreleased\]\s*([\s\S]*?)(?=## \[|$)/,
    );
    const unreleasedContent = unreleasedMatch ? unreleasedMatch[1].trim() : "";

    if (unreleasedContent) {
      changelog = changelog.replace(
        /## \[Unreleased\]\s*([\s\S]*?)(?=## \[|$)/,
        `${newUnreleased}${releaseHeader}\n\n${unreleasedContent}\n\n`,
      );
    } else {
      // Add commits as changes if no content
      const changes = commits
        .split("\n")
        .filter(Boolean)
        .map((line) => `- ${line}`)
        .join("\n");

      changelog = changelog.replace(
        /## \[Unreleased\]\s*/,
        `${newUnreleased}${releaseHeader}\n\n### Changed\n\n${changes || "- Initial release"}\n\n`,
      );
    }
  }

  return changelog;
}

async function main() {
  log("\n🚀 Déploiement de @jlguenego/ai-cli", colors.blue);

  if (isDryRun) {
    logWarning("Mode dry-run activé - aucune modification ne sera effectuée");
  }

  try {
    // Step 1: Check branch
    logStep("1/7", "Vérification de la branche...");
    const currentBranch = getCurrentBranch();

    if (currentBranch !== ALLOWED_BRANCH) {
      logError(
        `La branche courante est '${currentBranch}', mais seule '${ALLOWED_BRANCH}' est autorisée.`,
      );
      logError(`Exécutez: git checkout ${ALLOWED_BRANCH}`);
      process.exit(1);
    }
    logSuccess(`Branche '${currentBranch}' OK`);

    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
      logError("Des changements non commités sont présents.");
      logError("Exécutez: git status");
      process.exit(1);
    }
    logSuccess("Pas de changements non commités");

    // Step 2: Run tests
    logStep("2/7", "Exécution des tests...");
    if (!isDryRun) {
      exec("npm test");
    } else {
      logWarning("Tests ignorés en mode dry-run");
    }
    logSuccess("Tests passés");

    // Step 3: Build
    logStep("3/7", "Build TypeScript...");
    if (!isDryRun) {
      exec("npm run build");
    } else {
      logWarning("Build ignoré en mode dry-run");
    }
    logSuccess("Build réussi");

    // Step 4: Check version
    logStep("4/7", "Vérification de la version...");
    const pkg = getPackageJson();
    const localVersion = pkg.version;
    const publishedVersion = getPublishedVersion(pkg.name);

    log(`  Version locale: ${localVersion}`);
    log(`  Version publiée: ${publishedVersion || "aucune"}`);

    if (publishedVersion === localVersion) {
      logError(`La version ${localVersion} est déjà publiée sur npm.`);
      logError("Incrémentez la version dans package.json avant de déployer.");
      process.exit(1);
    }
    logSuccess(`Version ${localVersion} prête pour publication`);

    // Step 5: Publish to npm
    logStep("5/7", "Publication sur npm...");
    if (!isDryRun) {
      exec("npm publish --access public");
      logSuccess(`Package publié: ${pkg.name}@${localVersion}`);
    } else {
      exec("npm publish --access public --dry-run");
      logWarning("Publication simulée (dry-run)");
    }

    // Step 6: Create Git tag
    logStep("6/7", "Création du tag Git...");
    const tagName = `v${localVersion}`;

    if (!isDryRun) {
      exec(`git tag -a ${tagName} -m "Release ${tagName}"`);
      exec(`git push origin ${tagName}`);
      logSuccess(`Tag ${tagName} créé et poussé`);
    } else {
      logWarning(`Tag ${tagName} serait créé (dry-run)`);
    }

    // Step 7: Update CHANGELOG
    logStep("7/7", "Mise à jour du CHANGELOG...");
    const changelogPath = join(projectRoot, "CHANGELOG.md");
    const changelog = generateChangelog(localVersion);

    if (!isDryRun) {
      writeFileSync(changelogPath, changelog, "utf-8");
      exec("git add CHANGELOG.md");
      exec(`git commit -m "docs: update CHANGELOG for v${localVersion}"`);
      exec("git push");
      logSuccess("CHANGELOG.md mis à jour et poussé");
    } else {
      logWarning("CHANGELOG.md serait mis à jour (dry-run)");
    }

    // Success
    log("\n✅ Déploiement terminé avec succès!", colors.green);
    log(`\n📦 Package: ${pkg.name}@${localVersion}`, colors.blue);
    log(`🏷️  Tag: v${localVersion}`, colors.blue);
    log(`🔗 https://www.npmjs.com/package/${pkg.name}`, colors.blue);
  } catch (error) {
    logError(`\nErreur lors du déploiement: ${error.message}`);
    process.exit(1);
  }
}

main();
