import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { getLawTextTool, searchLawTool, lawTools } from "./tools/law.js";
import { assemblyTools, getBillDetailTool, searchBillTool } from "./tools/assembly.js";
import { bundleTools, resolveSourceBundleTool } from "./tools/bundle.js";
import { getLawmakingItemDetailTool, lawmakingTools, searchLawmakingItemsTool } from "./tools/lawmaking.js";
import { gazetteTools, searchGazetteItemsTool } from "./tools/gazette.js";
import { compareStatSeriesTool, getStatSeriesTool, searchStatSeriesTool, statTools } from "./tools/stats.js";
import { datasetTools, getDatasetMetadataTool, searchPublicDatasetTool } from "./tools/dataset.js";

const TOOL_TEXT_MIME = "application/json";

type JsonSchemaProperty = {
  type?: string;
  description?: string;
};

type JsonSchemaObject = {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

export const toolCatalog = [...bundleTools, ...lawTools, ...assemblyTools, ...lawmakingTools, ...gazetteTools, ...statTools, ...datasetTools];

export async function runTool(name: string, input: unknown): Promise<unknown> {
  switch (name) {
    case "search_law":
      return searchLawTool(input as { query: string; limit?: number });
    case "resolve_source_bundle":
      return resolveSourceBundleTool(input as { query: string });
    case "get_law_text":
      return getLawTextTool(input as { law_name?: string; mst?: string; article_ref?: string });
    case "search_bill":
      return searchBillTool(input as { bill_no?: string; bill_name?: string; proposer?: string; committee?: string; age?: string; limit?: number });
    case "get_bill_detail":
      return getBillDetailTool(input as { bill_no?: string; bill_id?: string });
    case "search_lawmaking_items":
      return searchLawmakingItemsTool(input as { category: "gov-status" | "plan" | "notice" | "notice-mod" | "admin-notice" | "interpretation" | "example"; agency_code?: string; agency_name?: string; law_kind_code?: string; status_code?: string; year?: string; start_date?: string; end_date?: string; query?: string; query_field?: string; limit?: number });
    case "get_lawmaking_item_detail":
      return getLawmakingItemDetailTool(input as { category: "gov-status" | "plan" | "notice" | "notice-mod" | "admin-notice" | "interpretation" | "example"; item_id: string; mapping_id?: string; announce_type?: string });
    case "search_gazette_items":
      return searchGazetteItemsTool(input as { query?: string; agency_name?: string; law_name?: string; start_date?: string; end_date?: string; limit?: number });
    case "search_stat_series":
      return searchStatSeriesTool(input as { query: string; source?: "ecos" | "kosis" | "all"; limit?: number });
    case "get_stat_series":
      return getStatSeriesTool(input as { source: "ecos" | "kosis"; table_id: string; item_code?: string; org_id?: string; obj_l1?: string; obj_l2?: string; obj_l3?: string; start: string; end: string });
    case "compare_stat_series":
      return compareStatSeriesTool(input as { series_a_identifier: string; series_b_identifier: string; series_a_label?: string; series_b_label?: string; series_a_org_id?: string; series_b_org_id?: string; start: string; end: string });
    case "search_public_dataset":
      return searchPublicDatasetTool(input as { query: string; limit?: number });
    case "get_dataset_metadata":
      return getDatasetMetadataTool(input as { dataset_id?: string; service_id?: string });
    default:
      throw new Error(`Unsupported tool: ${name}`);
  }
}

function toZodPropertySchema(property: JsonSchemaProperty, required: boolean): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (property.type) {
    case "number":
      schema = z.number();
      break;
    case "integer":
      schema = z.number().int();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "string":
    default:
      schema = z.string();
      break;
  }

  if (property.description) {
    schema = schema.describe(property.description);
  }

  return required ? schema : schema.optional();
}

function toZodInputSchema(inputSchema: JsonSchemaObject | undefined): Record<string, z.ZodTypeAny> {
  if (!inputSchema || inputSchema.type !== "object") {
    return {};
  }

  const required = new Set(inputSchema.required ?? []);
  const entries = Object.entries(inputSchema.properties ?? {}).map(([key, property]) => [key, toZodPropertySchema(property, required.has(key))] as const);

  return Object.fromEntries(entries);
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "korean-government-api-bundle",
    version: "0.1.0"
  });

  for (const tool of toolCatalog) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: toZodInputSchema(tool.inputSchema as JsonSchemaObject)
      },
      async (input) => {
        const result = await runTool(tool.name, input);
        const json = JSON.stringify(result, null, 2);

        return {
          content: [
            {
              type: "text",
              text: json,
              mimeType: TOOL_TEXT_MIME
            }
          ],
          structuredContent: result as Record<string, unknown>
        };
      }
    );
  }

  return server;
}

export async function startStdioServer(): Promise<void> {
  const transport = new StdioServerTransport();
  const server = createMcpServer();
  await server.connect(transport);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const [mode, toolName, rawInput] = process.argv.slice(2);

  if (mode === "--list-tools") {
    console.log(JSON.stringify(toolCatalog, null, 2));
  } else if (mode === "run" && toolName) {
    const parsed = rawInput ? JSON.parse(rawInput) : {};
    runTool(toolName, parsed)
      .then((result) => console.log(JSON.stringify(result, null, 2)))
      .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      });
  } else {
    startStdioServer().catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  }
}
