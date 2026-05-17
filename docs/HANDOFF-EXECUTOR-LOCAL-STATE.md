# Handoff Executor Local State

This note captures the local, not-yet-committed executor work so it does not get mixed into unrelated docs commits.

## Current intent

The current local code changes appear to be moving `korean-government-api-bundle` toward a handoff/executor surface that can run resolved bundles through CLI/MCP instead of only documenting API alignment.

## Dirty files to review together

- `src/cli/index.ts`
- `src/core/types.ts`
- `src/core/bundle-executor.ts`
- `src/mcp/server.ts`
- `src/mcp/tools/bundle.ts`
- `docs/ASSEMBLY-SMOKE-CHECKLIST.md`

Do not commit these piecemeal unless the diff is intentionally split. The code files should be tested as one vertical slice.

## Safe verification before commit

```bash
cd /Users/seohoseong/.openclaw/workspace/korean-government-api-bundle
npm run build
```

When `ASSEMBLY_API_KEY` is available, run the one-command smoke path:

```bash
ASSEMBLY_API_KEY=*** bash /Users/seohoseong/.openclaw/workspace/inbox/assembly-smoke-runbook.sh
```

## Blocked live verification

Live Assembly verification remains blocked until `ASSEMBLY_API_KEY` is set. Until then, prefer build/type verification and keep the checklist/runbook ready rather than adding more Assembly-facing behavior.

## Suggested next decision

If build passes and the executor diff is coherent, make a focused commit such as:

```text
feat: add resolved bundle executor surface
```

If build fails, split the work into:

1. type definitions and executor core
2. CLI command wiring
3. MCP tool registration
4. smoke checklist/runbook documentation

## Heartbeat verification — 2026-05-07 19:40 KST

- `npm run build` passed with the current dirty executor slice.
- Repo is still intentionally dirty; no commit/push was made from heartbeat.
- Live Assembly smoke remains blocked until `ASSEMBLY_API_KEY` is set.
- Next safe action: review the executor diff as one vertical slice before committing; do not mix with unrelated docs-only changes.

## Heartbeat diff review — 2026-05-07 23:40 KST

Observed vertical slice:

- `src/core/bundle-executor.ts` defines the allowed auto-executable bundle tools and rejects non-ready/non-executable resolutions with `InputError`.
- `src/mcp/tools/bundle.ts` adds `run_resolved_bundle`, keeps unresolved/ambiguous cases non-executing, and only calls the underlying tool after `resolve_source_bundle` returns `handoff_status: ready`.
- `src/mcp/server.ts` wires `run_resolved_bundle` through `runTool`.
- `src/cli/index.ts` exposes `kgab run-resolved-bundle <query>` and reuses the server runner.

Review notes before commit:

1. Keep this as one commit only if the intended product surface is “resolve then execute when ready.”
2. Add or run a CLI smoke with a non-secret path first, e.g. a law/gazette/public-dataset query, before trying Assembly.
3. Assembly live execution still depends on `ASSEMBLY_API_KEY`; do not mark Assembly smoke complete from build-only evidence.
4. `docs/ASSEMBLY-SMOKE-CHECKLIST.md` should remain the live-key gate, not a general executor test.

## Heartbeat CLI smoke — 2026-05-08 03:40 KST

Non-secret executor smoke results:

- `npm run build` passed.
- `node dist/cli/index.js run-resolved-bundle "공공데이터포털 데이터셋"` routed to `search_public_dataset`, executed, and returned a structured JSON result. The provider returned no matching candidates, but the executor path itself worked (`executed: true`, `executed_tool: search_public_dataset`).
- Secret-backed routes still correctly stop on missing environment configuration in this shell: `run-resolved-bundle "정부조직법"` requires `LAW_OC`; `run-resolved-bundle "관보 검색"` requires `GAZETTE_SERVICE_KEY`.

Next safe step before commit:

- Decide whether the current secret-missing errors should be caught and returned as structured `execution_result` failures instead of raw CLI errors. If yes, add error wrapping before committing the executor slice.
