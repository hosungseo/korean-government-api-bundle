#!/usr/bin/env node

import { getBillDetailTool, searchBillTool } from "../mcp/tools/assembly.js";
import { getDatasetMetadataTool, searchPublicDatasetTool } from "../mcp/tools/dataset.js";
import { getLawTextTool, searchLawTool } from "../mcp/tools/law.js";
import { getStatSeriesTool, searchStatSeriesTool } from "../mcp/tools/stats.js";

function printUsage(): void {
  console.log(`Usage:
  kgab search-law <query> [--limit N]
  kgab search_law <query> [--limit N]
  kgab get-law-text --mst <MST> [--article 제1조]
  kgab get-law-text --law-name <법령명> [--article 제1조]
  kgab search-bill --bill-no <의안번호>
  kgab search-bill --bill-name <의안명> [--committee <위원회>] [--age <제22대>] [--limit N]
  kgab get-bill-detail --bill-no <의안번호>
  kgab get-bill-detail --bill-id <BILL_ID>
  kgab search-stat-series <query> [--source ecos|kosis|all] [--limit N]
  kgab get-stat-series --source ecos --table <STAT_CODE> [--item <ITEM_CODE>] --start YYYYMM --end YYYYMM
  kgab search-public-dataset <query> [--limit N]
  kgab get-dataset-metadata --dataset-id <ID>
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

  if (command === "search-bill" || command === "search_bill") {
    const limit = parseLimit(rest);
    const billNo = parseOption(rest, "--bill-no");
    const billName = parseOption(rest, "--bill-name");
    const proposer = parseOption(rest, "--proposer");
    const committee = parseOption(rest, "--committee");
    const age = parseOption(rest, "--age");
    const result = await searchBillTool({ bill_no: billNo, bill_name: billName, proposer, committee, age, limit });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "get-bill-detail" || command === "get_bill_detail") {
    const billNo = parseOption(rest, "--bill-no");
    const billId = parseOption(rest, "--bill-id");
    const result = await getBillDetailTool({ bill_no: billNo, bill_id: billId });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "search-stat-series" || command === "search_stat_series") {
    const limit = parseLimit(rest);
    const source = parseOption(rest, "--source") as "ecos" | "kosis" | "all" | undefined;
    const queryParts = rest.filter((arg, index) => !["--limit", "--source"].includes(arg) && !["--limit", "--source"].includes(rest[index - 1] ?? ""));
    const query = queryParts.join(" ").trim();
    const result = await searchStatSeriesTool({ query, source, limit });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "get-stat-series" || command === "get_stat_series") {
    const source = (parseOption(rest, "--source") as "ecos" | "kosis" | undefined) ?? "ecos";
    const tableId = parseOption(rest, "--table");
    const itemCode = parseOption(rest, "--item");
    const start = parseOption(rest, "--start");
    const end = parseOption(rest, "--end");
    const result = await getStatSeriesTool({ source, table_id: tableId ?? "", item_code: itemCode, start: start ?? "", end: end ?? "" });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "search-public-dataset" || command === "search_public_dataset") {
    const limit = parseLimit(rest);
    const queryParts = rest.filter((arg, index) => !(arg === "--limit" || rest[index - 1] === "--limit"));
    const query = queryParts.join(" ").trim();
    const result = await searchPublicDatasetTool({ query, limit });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "get-dataset-metadata" || command === "get_dataset_metadata") {
    const datasetId = parseOption(rest, "--dataset-id");
    const serviceId = parseOption(rest, "--service-id");
    const result = await getDatasetMetadataTool({ dataset_id: datasetId, service_id: serviceId });
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
