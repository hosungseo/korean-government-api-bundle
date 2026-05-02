# Skill API Alignment

`k-gov-skill`에서 노출하는 public data API id와 `korean-government-api-bundle`의 실제 실행 표면을 한눈에 맞추기 위한 메모다.

핵심 원칙은 단순하다.

- `k-gov-skill`은 **사용자/에이전트가 먼저 읽는 안내면**이다.
- `korean-government-api-bundle`은 **실제 MCP/CLI 실행면**이다.
- 따라서 같은 API를 가리키더라도, skill 쪽은 `id + 신청 안내 + fallback + 예시`를 먼저 보여주고, bundle 쪽은 `search/get/compare` 도구로 실제 호출을 담당한다.

## Current shared public-data API ids

### `mois-resident-population`
- Skill side: `examples/public-data-api-catalog.json`
- Bundle side: `search_public_dataset`로 dataset 후보를 찾고, `get_dataset_metadata`로 상세 메타데이터를 본 뒤, 실제 호출 준비는 skill 예제 또는 별도 packet으로 넘긴다.
- Why this split exists: data.go.kr 승인키 신청과 파라미터 준비는 skill이 더 친절하게 설명하고, bundle은 discovery/metadata surface를 제공한다.
- Closest bundle commands:
  - `kgab search-public-dataset 주민등록 인구 --limit 5`
  - `kgab get-dataset-metadata --dataset-id 15108065`

### `molit-apartment-trade`
- Skill side: `examples/public-data-api-catalog.json`
- Bundle side: 현재는 data.go.kr dataset discovery/metadata tool로 연결된다.
- Closest bundle commands:
  - `kgab search-public-dataset 아파트 매매 실거래 --limit 5`
  - `kgab get-dataset-metadata --dataset-id <resolved-id>`
- Next likely expansion: bundle에 실거래 호출 preparation/helper를 붙이면 skill 예제와 더 직접적으로 이어질 수 있다.

### `neis-school-lunch`
- Skill side: `examples/public-data-api-catalog.json`
- Bundle side: 현재는 dataset discovery/metadata tool로 연결된다.
- Closest bundle commands:
  - `kgab search-public-dataset NEIS 급식 식단 --limit 5`
  - `kgab get-dataset-metadata --dataset-id <resolved-id>`

### `ecos-interest-rate`
- Skill side: `examples/public-data-api-catalog.json`
- Bundle side: ECOS adapter가 이미 실행 가능하다.
- Closest bundle commands:
  - `kgab search-stat-series 기준금리 --source ecos --limit 3`
  - `kgab get-stat-series --source ecos --table 722Y001 --item 0101000 --start 202501 --end 202504`
- Note: skill은 API key가 없을 때 호출 형식과 코드 이해를 돕고, bundle은 실제 series retrieval을 담당한다.

### `kosis-population`
- Skill side: `examples/public-data-api-catalog.json`
- Bundle side: KOSIS demographic slice와 `search_stat_series` / `get_stat_series`가 연결된다.
- Closest bundle commands:
  - `kgab search-stat-series 총인구 --source kosis --limit 3`
  - `kgab get-stat-series --source kosis --table DT_1IN1502 --start 2022 --end 2024`
- Current blocker: broader auto-expansion은 구현보다 `KOSIS_API_KEY` 확보가 먼저다.

## Current alignment summary

| Skill API id | Skill role | Bundle role | Current state |
| --- | --- | --- | --- |
| `mois-resident-population` | 신청 안내 + fallback + sample params | dataset search/metadata | partial alignment |
| `molit-apartment-trade` | 신청 안내 + sample params | dataset search/metadata | partial alignment |
| `neis-school-lunch` | 신청 안내 + sample params | dataset search/metadata | partial alignment |
| `ecos-interest-rate` | key/fallback + code explanation | live stat retrieval | strong alignment |
| `kosis-population` | key/fallback + table discovery framing | KOSIS stat retrieval | medium alignment |

## Practical recommendation

다음 구현은 새 API id를 더 늘리는 것보다 아래 순서가 맞다.

1. `ASSEMBLY_API_KEY` 확보 후 열린국회 실호출 smoke 재검증
2. `KOSIS_API_KEY` 확보 전까지 KOSIS auto-expansion은 blocked 유지
3. 그 다음 필요하면 data.go.kr 계열에서 `mois-resident-population` 같은 대표 API 하나를 bundle helper까지 더 직접 연결

이 문서는 “skill에서 보이는 것”과 “bundle에서 실제 실행되는 것”의 현재 간격을 명시적으로 남겨, 다음 구현이 새 목록 추가인지 adapter 심화인지 헷갈리지 않게 하기 위한 기준선이다.
