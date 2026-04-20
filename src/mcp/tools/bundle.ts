import { nowIso } from "../../core/citations.js";
import { InputError } from "../../core/errors.js";
import { getProviderById } from "../../core/provider-registry.js";
import { resolveSourceBundle } from "../../core/resolve.js";
import type { ResolveSourceBundleInput, ResolveSourceBundleResponse } from "../../core/types.js";

const MATCHING_RULES_URL = "https://github.com/hosungseo/korean-government-api-bundle/blob/main/docs/MATCHING-RULES.md";

export const bundleTools = [
  {
    name: "resolve_source_bundle",
    description: "질문을 어떤 MCP tool/provider로 보내는 게 맞는지 먼저 판별합니다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "라우팅할 사용자 질문" }
      },
      required: ["query"]
    }
  }
] as const;

export async function resolveSourceBundleTool(input: ResolveSourceBundleInput): Promise<ResolveSourceBundleResponse> {
  if (!input.query?.trim()) {
    throw new InputError("query is required for resolve_source_bundle");
  }

  const { resolution, recommendedTool, reasoning, entities, suggestedInput, missingRequiredFields, suggestedCli } = resolveSourceBundle(input);
  const provider = getProviderById(resolution.providerId);
  const providerName = provider?.providerName ?? resolution.providerId;

  return {
    source: "bundle",
    provider: "korean-government-api-bundle",
    tool: "resolve_source_bundle",
    query: input,
    identifier: `bundle:resolve:${recommendedTool}`,
    summary: `${recommendedTool}로 라우팅하는 것이 가장 적절합니다.`,
    original_url: MATCHING_RULES_URL,
    fetched_at: nowIso(),
    confidence: resolution.confidence,
    matched_by: resolution.matchedBy,
    alternatives: resolution.alternatives,
    intent: resolution.intent,
    recommended_provider_id: resolution.providerId,
    recommended_provider: providerName,
    recommended_tool: recommendedTool,
    reasoning,
    entities,
    suggested_input: suggestedInput,
    missing_required_fields: missingRequiredFields,
    suggested_cli: suggestedCli
  };
}
