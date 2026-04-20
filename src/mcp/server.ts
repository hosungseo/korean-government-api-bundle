import { searchLawTool, lawTools } from "./tools/law.js";
import { assemblyTools } from "./tools/assembly.js";
import { statTools } from "./tools/stats.js";
import { datasetTools } from "./tools/dataset.js";

export const toolCatalog = [...lawTools, ...assemblyTools, ...statTools, ...datasetTools];

export async function runTool(name: string, input: unknown): Promise<unknown> {
  switch (name) {
    case "search_law":
      return searchLawTool(input as { query: string; limit?: number });
    default:
      throw new Error(`Unsupported tool: ${name}`);
  }
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
  }
}
