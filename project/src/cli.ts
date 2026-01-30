#!/usr/bin/env node
/**
 * Point d'entrée CLI pour jlgcli.
 * Configure commander et dispatche les commandes.
 */

import { Command } from "commander";
import { VERSION, CLI_NAME } from "./index.js";
import { registerBackendsCommand } from "./commands/backends.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerRunCommand } from "./commands/run.js";

/**
 * Crée et configure le programme CLI principal.
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name(CLI_NAME)
    .description("CLI pour orchestrer des agents IA via des backends externes")
    .version(VERSION, "-v, --version", "Affiche la version")
    .helpOption("-h, --help", "Affiche l'aide");

  // Enregistrer les commandes
  registerBackendsCommand(program);
  registerConfigCommand(program);
  registerRunCommand(program);

  return program;
}

/**
 * Point d'entrée principal.
 */
function main(): void {
  const program = createProgram();
  program.parse(process.argv);
}

main();
