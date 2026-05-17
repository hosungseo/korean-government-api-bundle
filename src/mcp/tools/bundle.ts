import { nowIso } from "../../core/citations.js";
import { buildBundleExecutionInput, isExecutableBundleTool } from "../../core/bundle-executor.js";
import { InputError } from "../../core/errors.js";
import { getProviderById } from "../../core/provider-registry.js";
import { resolveSourceBundle } from "../../core/resolve.js";
import type { ResolveSourceBundleInput, ResolveSourceBundleResponse, RunResolvedBundleInput, RunResolvedBundleResponse } from "../../core/types.js";

const MATCHING_RULES_URL = "https://github.com/hosungseo/korean-government-api-bundle/blob/main/docs/MATCHING-RULES.md";

type BundleToolRunner = (name: string, input: unknown) => Promise<unknown>;

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
  },
  {
    name: "run_resolved_bundle",
    description: "질문을 먼저 라우팅하고, 추가 입력이 필요 없으면 추천 tool까지 바로 실행합니다.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "라우팅 후 바로 실행할 사용자 질문" }
      },
      required: ["query"]
    }
  }
] as const;

export async function resolveSourceBundleTool(input: ResolveSourceBundleInput): Promise<ResolveSourceBundleResponse> {
  if (!input.query?.trim()) {
    throw new InputError("query is required for resolve_source_bundle");
  }

  const { resolution, recommendedTool, reasoning, entities, suggestedInput, missingRequiredFields, suggestedCli, handoffStatus, handoffMessage, followUpQuestion, disambiguationOptions } = resolveSourceBundle(input);
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
    suggested_cli: suggestedCli,
    handoff_status: handoffStatus,
    handoff_message: handoffMessage,
    follow_up_question: followUpQuestion,
    disambiguation_options: disambiguationOptions
  };
}

export async function runResolvedBundleTool(input: RunResolvedBundleInput, runTool: BundleToolRunner): Promise<RunResolvedBundleResponse> {
  const resolution = await resolveSourceBundleTool(input);

  if (resolution.handoff_status !== "ready" || !isExecutableBundleTool(resolution.recommended_tool)) {
    return {
      source: "bundle",
      provider: "korean-government-api-bundle",
      tool: "run_resolved_bundle",
      query: input,
      identifier: `bundle:run:${resolution.recommended_tool}`,
      summary: resolution.handoff_status === "ready"
        ? `${resolution.recommended_tool} 실행 준비는 됐지만 자동 실행 대상이 아니라 라우팅 결과만 반환합니다.`
        : `자동 실행 전 단계에서 멈췄습니다: ${resolution.handoff_message}`,
      original_url: MATCHING_RULES_URL,
      fetched_at: nowIso(),
      confidence: resolution.confidence,
      matched_by: resolution.matched_by,
      alternatives: resolution.alternatives,
      resolution,
      executed: false,
      executed_tool: null,
      execution_input: null,
      execution_result: null
    };
  }

  const executionInput = buildBundleExecutionInput(resolution);
  const executionResult = await runTool(resolution.recommended_tool, executionInput);

  return {
    source: "bundle",
    provider: "korean-government-api-bundle",
    tool: "run_resolved_bundle",
    query: input,
    identifier: `bundle:run:${resolution.recommended_tool}`,
    summary: `${resolution.recommended_tool}로 라우팅한 뒤 즉시 실행했습니다.`,
    original_url: MATCHING_RULES_URL,
    fetched_at: nowIso(),
    confidence: resolution.confidence,
    matched_by: resolution.matched_by,
    alternatives: resolution.alternatives,
    resolution,
    executed: true,
    executed_tool: resolution.recommended_tool,
    execution_input: executionInput,
    execution_result: executionResult
  };
}
