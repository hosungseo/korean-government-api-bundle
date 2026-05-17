import type { ResolveSourceBundleResponse } from "./types.js";
import { InputError } from "./errors.js";

export type BundleExecutableTool =
  | "search_law"
  | "get_law_text"
  | "search_bill"
  | "search_lawmaking_items"
  | "search_gazette_items"
  | "search_stat_series"
  | "compare_stat_series"
  | "search_public_dataset";

const executableTools = new Set<BundleExecutableTool>([
  "search_law",
  "get_law_text",
  "search_bill",
  "search_lawmaking_items",
  "search_gazette_items",
  "search_stat_series",
  "compare_stat_series",
  "search_public_dataset"
]);

export function isExecutableBundleTool(tool: string): tool is BundleExecutableTool {
  return executableTools.has(tool as BundleExecutableTool);
}

export function buildBundleExecutionInput(resolution: ResolveSourceBundleResponse): Record<string, string | number | boolean | null> {
  if (resolution.handoff_status !== "ready") {
    throw new InputError(`resolve_source_bundle is not ready for execution: ${resolution.handoff_status}`);
  }

  if (!isExecutableBundleTool(resolution.recommended_tool)) {
    throw new InputError(`recommended tool is not executable via bundle executor: ${resolution.recommended_tool}`);
  }

  return { ...resolution.suggested_input };
}
