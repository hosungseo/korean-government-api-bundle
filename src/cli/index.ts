#!/usr/bin/env node

import { getBillDetailTool, searchBillTool } from "../mcp/tools/assembly.js";
import { resolveSourceBundleTool, runResolvedBundleTool } from "../mcp/tools/bundle.js";
import { getDatasetMetadataTool, searchPublicDatasetTool } from "../mcp/tools/dataset.js";
import { buildIssueDossierTool, checkIssueGapsTool, composeIssuePacketTool, renderIssueBriefTool, renderIssueEvidenceMatrixTool, renderIssueOnepagerTool, renderIssueScenarioLabTool, renderIssueTimelineTool, routeIssueNextActionTool } from "../mcp/tools/issue.js";
import { getLawTextTool, searchLawTool } from "../mcp/tools/law.js";
import { getLawmakingItemDetailTool, searchLawmakingItemsTool } from "../mcp/tools/lawmaking.js";
import { searchGazetteItemsTool } from "../mcp/tools/gazette.js";
import { compareStatSeriesTool, getStatSeriesTool, searchStatSeriesTool } from "../mcp/tools/stats.js";

function printUsage(): void {
  console.log(`Usage:
  kgab search-law <query> [--limit N]
  kgab search_law <query> [--limit N]
  kgab resolve-source-bundle <query>
  kgab run-resolved-bundle <query>
  kgab get-law-text --mst <MST> [--article 제1조]
  kgab get-law-text --law-name <법령명> [--article 제1조]
  kgab search-bill --bill-no <의안번호>
  kgab search-bill --bill-name <의안명> [--committee <위원회>] [--age <제22대>] [--limit N]
  kgab get-bill-detail --bill-no <의안번호>
  kgab get-bill-detail --bill-id <BILL_ID>
  kgab search-lawmaking-items --category <gov-status|plan|notice|notice-mod|admin-notice|interpretation|example> [--agency-code <코드>] [--agency-name <기관명>] [--law-kind-code <코드>] [--status-code <코드>] [--year YYYY] [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD] [--query <검색어>] [--query-field <필드>] [--limit N]
  kgab get-lawmaking-item-detail --category <gov-status|plan|notice|notice-mod|admin-notice|interpretation|example> --item-id <ID> [--mapping-id <ID>] [--announce-type TYPE5]
  kgab search-gazette-items [--query <검색어>] [--agency-name <기관명>] [--law-name <근거법령명>] [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD] [--limit N]
  kgab search-stat-series <query> [--source ecos|kosis|all] [--limit N]
  kgab get-stat-series --source ecos|kosis --table <STAT_CODE> [--item <ITEM_CODE>] [--org <ORG_ID>] [--obj-l1 <CODE>] [--obj-l2 <CODE>] [--obj-l3 <CODE>] --start YYYYMM --end YYYYMM
  kgab compare-stat-series --id-a <IDENTIFIER> --id-b <IDENTIFIER> [--label-a <이름>] [--label-b <이름>] [--org-a <ORG_ID>] [--org-b <ORG_ID>] --start YYYYMM --end YYYYMM
  kgab search-public-dataset <query> [--limit N]
  kgab get-dataset-metadata --dataset-id <ID>
  kgab compose-issue-packet --topic <주제> [--law-query <검색어>] [--gazette-query <검색어>] [--stat-query <검색어>] [--dataset-query <검색어>] [--limit N]
  kgab render-issue-onepager --topic <주제> [--law-query <검색어>] [--gazette-query <검색어>] [--stat-query <검색어>] [--dataset-query <검색어>] [--limit N]
  kgab render-issue-brief --topic <주제> [--law-query <검색어>] [--gazette-query <검색어>] [--stat-query <검색어>] [--dataset-query <검색어>] [--limit N]
  kgab render-issue-evidence-matrix --topic <주제> [--law-query <검색어>] [--gazette-query <검색어>] [--stat-query <검색어>] [--dataset-query <검색어>] [--limit N]
  kgab render-issue-timeline --topic <주제> [--law-query <검색어>] [--gazette-query <검색어>] [--stat-query <검색어>] [--dataset-query <검색어>] [--limit N]
  kgab check-issue-gaps --topic <주제> [--law-query <검색어>] [--gazette-query <검색어>] [--stat-query <검색어>] [--dataset-query <검색어>] [--limit N]
  kgab route-issue-next-action --topic <주제> [--law-query <검색어>] [--gazette-query <검색어>] [--stat-query <검색어>] [--dataset-query <검색어>] [--limit N]
  kgab render-issue-scenario-lab --topic <주제> [--law-query <검색어>] [--gazette-query <검색어>] [--stat-query <검색어>] [--dataset-query <검색어>] [--limit N]
  kgab build-issue-dossier --topic <주제> [--law-query <검색어>] [--gazette-query <검색어>] [--stat-query <검색어>] [--dataset-query <검색어>] [--limit N]
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

  if (command === "resolve-source-bundle" || command === "resolve_source_bundle") {
    const query = rest.join(" ").trim();
    const result = await resolveSourceBundleTool({ query });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "run-resolved-bundle" || command === "run_resolved_bundle") {
    const { runTool } = await import("../mcp/server.js");
    const query = rest.join(" ").trim();
    const result = await runResolvedBundleTool({ query }, runTool);
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

  if (command === "search-lawmaking-items" || command === "search_lawmaking_items") {
    const category = parseOption(rest, "--category") as "gov-status" | "plan" | "notice" | "notice-mod" | "admin-notice" | "interpretation" | "example" | undefined;
    const agencyCode = parseOption(rest, "--agency-code");
    const agencyName = parseOption(rest, "--agency-name");
    const lawKindCode = parseOption(rest, "--law-kind-code");
    const statusCode = parseOption(rest, "--status-code");
    const year = parseOption(rest, "--year");
    const startDate = parseOption(rest, "--start-date");
    const endDate = parseOption(rest, "--end-date");
    const query = parseOption(rest, "--query");
    const queryField = parseOption(rest, "--query-field");
    const limit = parseLimit(rest);
    const result = await searchLawmakingItemsTool({
      category: category ?? "gov-status",
      agency_code: agencyCode,
      agency_name: agencyName,
      law_kind_code: lawKindCode,
      status_code: statusCode,
      year,
      start_date: startDate,
      end_date: endDate,
      query,
      query_field: queryField,
      limit
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "get-lawmaking-item-detail" || command === "get_lawmaking_item_detail") {
    const category = parseOption(rest, "--category") as "gov-status" | "plan" | "notice" | "notice-mod" | "admin-notice" | "interpretation" | "example" | undefined;
    const itemId = parseOption(rest, "--item-id");
    const mappingId = parseOption(rest, "--mapping-id");
    const announceType = parseOption(rest, "--announce-type");
    const result = await getLawmakingItemDetailTool({
      category: category ?? "gov-status",
      item_id: itemId ?? "",
      mapping_id: mappingId,
      announce_type: announceType
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "search-gazette-items" || command === "search_gazette_items") {
    const query = parseOption(rest, "--query");
    const agencyName = parseOption(rest, "--agency-name");
    const lawName = parseOption(rest, "--law-name");
    const startDate = parseOption(rest, "--start-date");
    const endDate = parseOption(rest, "--end-date");
    const limit = parseLimit(rest);
    const result = await searchGazetteItemsTool({
      query,
      agency_name: agencyName,
      law_name: lawName,
      start_date: startDate,
      end_date: endDate,
      limit
    });
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

  if (command === "compare-stat-series" || command === "compare_stat_series") {
    const seriesAIdentifier = parseOption(rest, "--id-a");
    const seriesBIdentifier = parseOption(rest, "--id-b");
    const seriesALabel = parseOption(rest, "--label-a");
    const seriesBLabel = parseOption(rest, "--label-b");
    const seriesAOrgId = parseOption(rest, "--org-a");
    const seriesBOrgId = parseOption(rest, "--org-b");
    const start = parseOption(rest, "--start");
    const end = parseOption(rest, "--end");
    const result = await compareStatSeriesTool({
      series_a_identifier: seriesAIdentifier ?? "",
      series_b_identifier: seriesBIdentifier ?? "",
      series_a_label: seriesALabel,
      series_b_label: seriesBLabel,
      series_a_org_id: seriesAOrgId,
      series_b_org_id: seriesBOrgId,
      start: start ?? "",
      end: end ?? ""
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "get-stat-series" || command === "get_stat_series") {
    const source = (parseOption(rest, "--source") as "ecos" | "kosis" | undefined) ?? "ecos";
    const tableId = parseOption(rest, "--table");
    const itemCode = parseOption(rest, "--item");
    const orgId = parseOption(rest, "--org");
    const objL1 = parseOption(rest, "--obj-l1");
    const objL2 = parseOption(rest, "--obj-l2");
    const objL3 = parseOption(rest, "--obj-l3");
    const start = parseOption(rest, "--start");
    const end = parseOption(rest, "--end");
    const result = await getStatSeriesTool({
      source,
      table_id: tableId ?? "",
      item_code: itemCode,
      org_id: orgId,
      obj_l1: objL1,
      obj_l2: objL2,
      obj_l3: objL3,
      start: start ?? "",
      end: end ?? ""
    });
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

  if (command === "compose-issue-packet" || command === "compose_issue_packet") {
    const result = await composeIssuePacketTool({
      topic: parseOption(rest, "--topic") ?? rest.filter((arg) => !arg.startsWith("--")).join(" ").trim(),
      law_query: parseOption(rest, "--law-query"),
      gazette_query: parseOption(rest, "--gazette-query"),
      stat_query: parseOption(rest, "--stat-query"),
      dataset_query: parseOption(rest, "--dataset-query"),
      limit: parseLimit(rest)
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "render-issue-onepager" || command === "render_issue_onepager") {
    const result = await renderIssueOnepagerTool({
      topic: parseOption(rest, "--topic") ?? rest.filter((arg) => !arg.startsWith("--")).join(" ").trim(),
      law_query: parseOption(rest, "--law-query"),
      gazette_query: parseOption(rest, "--gazette-query"),
      stat_query: parseOption(rest, "--stat-query"),
      dataset_query: parseOption(rest, "--dataset-query"),
      limit: parseLimit(rest)
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "render-issue-brief" || command === "render_issue_brief") {
    const result = await renderIssueBriefTool({ topic: parseOption(rest, "--topic") ?? rest.filter((arg) => !arg.startsWith("--")).join(" ").trim(), law_query: parseOption(rest, "--law-query"), gazette_query: parseOption(rest, "--gazette-query"), stat_query: parseOption(rest, "--stat-query"), dataset_query: parseOption(rest, "--dataset-query"), limit: parseLimit(rest) });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "render-issue-evidence-matrix" || command === "render_issue_evidence_matrix") {
    const result = await renderIssueEvidenceMatrixTool({ topic: parseOption(rest, "--topic") ?? rest.filter((arg) => !arg.startsWith("--")).join(" ").trim(), law_query: parseOption(rest, "--law-query"), gazette_query: parseOption(rest, "--gazette-query"), stat_query: parseOption(rest, "--stat-query"), dataset_query: parseOption(rest, "--dataset-query"), limit: parseLimit(rest) });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "render-issue-timeline" || command === "render_issue_timeline") {
    const result = await renderIssueTimelineTool({ topic: parseOption(rest, "--topic") ?? rest.filter((arg) => !arg.startsWith("--")).join(" ").trim(), law_query: parseOption(rest, "--law-query"), gazette_query: parseOption(rest, "--gazette-query"), stat_query: parseOption(rest, "--stat-query"), dataset_query: parseOption(rest, "--dataset-query"), limit: parseLimit(rest) });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "check-issue-gaps" || command === "check_issue_gaps") {
    const result = await checkIssueGapsTool({ topic: parseOption(rest, "--topic") ?? rest.filter((arg) => !arg.startsWith("--")).join(" ").trim(), law_query: parseOption(rest, "--law-query"), gazette_query: parseOption(rest, "--gazette-query"), stat_query: parseOption(rest, "--stat-query"), dataset_query: parseOption(rest, "--dataset-query"), limit: parseLimit(rest) });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "route-issue-next-action" || command === "route_issue_next_action") {
    const result = await routeIssueNextActionTool({ topic: parseOption(rest, "--topic") ?? rest.filter((arg) => !arg.startsWith("--")).join(" ").trim(), law_query: parseOption(rest, "--law-query"), gazette_query: parseOption(rest, "--gazette-query"), stat_query: parseOption(rest, "--stat-query"), dataset_query: parseOption(rest, "--dataset-query"), limit: parseLimit(rest) });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "render-issue-scenario-lab" || command === "render_issue_scenario_lab") {
    const result = await renderIssueScenarioLabTool({ topic: parseOption(rest, "--topic") ?? rest.filter((arg) => !arg.startsWith("--")).join(" ").trim(), law_query: parseOption(rest, "--law-query"), gazette_query: parseOption(rest, "--gazette-query"), stat_query: parseOption(rest, "--stat-query"), dataset_query: parseOption(rest, "--dataset-query"), limit: parseLimit(rest) });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "build-issue-dossier" || command === "build_issue_dossier") {
    const result = await buildIssueDossierTool({ topic: parseOption(rest, "--topic") ?? rest.filter((arg) => !arg.startsWith("--")).join(" ").trim(), law_query: parseOption(rest, "--law-query"), gazette_query: parseOption(rest, "--gazette-query"), stat_query: parseOption(rest, "--stat-query"), dataset_query: parseOption(rest, "--dataset-query"), limit: parseLimit(rest) });
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
