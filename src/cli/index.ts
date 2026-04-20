#!/usr/bin/env node

import { getLawTextTool, searchLawTool } from "../mcp/tools/law.js";

function printUsage(): void {
  console.log(`Usage:
  kgab search-law <query> [--limit N]
  kgab search_law <query> [--limit N]
  kgab get-law-text --mst <MST> [--article 제1조]
  kgab get-law-text --law-name <법령명> [--article 제1조]
  kgab mcp --list-tools
  kgab mcp run <tool_name> '<json>'`);
}

function parseLimit(args: string[]): number | undefined {
  const index = args.findIndex((arg) => arg === "--limit");
  if (index === -1) return undefined;
  const raw = args[index + 1];
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOption(args: string[], optionName: string): string | undefined {
  const index = args.findIndex((arg) => arg === optionName);
  if (index === -1) return undefined;
  return args[index + 1];
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === "mcp") {
    const { runTool, toolCatalog } = await import("../mcp/server.js");
    const [mcpCommand, toolName, rawInput] = rest;

    if (mcpCommand === "--list-tools") {
      console.log(JSON.stringify(toolCatalog, null, 2));
      return;
    }

    if (mcpCommand === "run" && toolName) {
      const input = rawInput ? JSON.parse(rawInput) : {};
      const result = await runTool(toolName, input);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === "search-law" || command === "search_law") {
    const limit = parseLimit(rest);
    const queryParts = rest.filter((arg, index) => !(arg === "--limit" || rest[index - 1] === "--limit"));
    const query = queryParts.join(" ").trim();
    const result = await searchLawTool({ query, limit });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "get-law-text" || command === "get_law_text") {
    const mst = parseOption(rest, "--mst");
    const lawName = parseOption(rest, "--law-name");
    const articleRef = parseOption(rest, "--article");
    const result = await getLawTextTool({ mst, law_name: lawName, article_ref: articleRef });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
