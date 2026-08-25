---
description: API endpoints, query format, response types. Read when working on API calls, services, or data fetching.
alwaysApply: false
---

# CSC Discovery — API Endpoints

## Base URL

Always `/api` on this app's own origin — fixed, not configurable. nginx (`docker/nginx.conf`)
proxies it to the real backend (`BACKEND_URL`) server-side. See `auth.md` for why this must stay
same-origin rather than pointing at the backend's own hostname directly.

Swagger UI on the backend itself: `http://localhost:8000/docs` (dev), not proxied through this app.

## Endpoints

| Method | Path | Description | Cache |
|---|---|---|---|
| GET | `/filtering_terms` | All filter field definitions — static list | `staleTime: Infinity` |
| GET | `/filtering_terms/{field_id}/values` | Field values with counts | `staleTime: 4h` |
| GET | `/filtering_terms/{field_id}/suggestions?term=xxx` | Autocomplete | `staleTime: 5min` |
| GET | `/filtering_groups` | UI grouping config for filter fields | `staleTime: Infinity` |
| GET | `/filtering_scopes` | Available scope definitions (`clinical` / `non_clinical`) | `staleTime: Infinity` |
| GET | `/filtering_qualifiers` | Available qualifier definitions (e.g. `observation`) | `staleTime: Infinity` |
| POST | `/datasets` | Beacon V2 search — dataset-level (clinical, record granularity) | per query key |
| POST | `/images` | Beacon V2 search — image-level (non-clinical, count granularity) | per query key |
| GET | `/status` | Deployment/indexing status — document counts per scope | `staleTime: 5min`, `refetchInterval: 5min` |
| GET | `/health` | Health check | — |

## Filter Field Types → UI Components

| `type` | Component | Fields |
|---|---|---|
| `text` | `<TextField>` | `dataset_title`, `dataset_description` |
| `keyword` | `<OntologyPicker>` `:allow-free-text="true"` | `staining_target` |
| `controlledValue` | `<MultiSelect>` | `sex` |
| `ontology` | `<OntologyPicker>` `:allow-free-text="false"` | `anatomical_site`, `animal_species`, `specimen_type`, `block_preparation`, `diagnosis`, `finding`, `finding_severity`, `finding_chronicity`, `finding_distribution`, `finding_result_category` |
| `ontologyOrValue` | `<OntologyPicker>` `:allow-free-text="true"` | `fixation_type`, `staining_procedure`, `staining_substance` |
| `iso8601Range` | `<RangePicker>` | `age_at_extraction` |

## GET /filtering_terms — Response

```ts
{
  meta: {
    apiVersion: string
    beaconId: string
    returnedSchemas: { entityType: string }[]
  }
  response: {
    filteringTerms: [
      {
        id: string                          // e.g. "anatomical_site"
        type: "text" | "keyword" | "controlledValue" | "ontology" | "ontologyOrValue" | "iso8601Range"
        label: string                       // e.g. "Anatomical site"
        description: string
        ui_group?: string | null            // maps to a BeaconFilteringGroup id
        ui_display?: boolean                // if false, field is hidden from UI
        scopes: string[]                    // e.g. ["specimen"]
        ontology?: {
          id: string                        // always "SCTID"
        }
        controlledValues?: string[]         // only for type="controlledValue"
      }
    ]
  }
}
```

## GET /filtering_groups — Response

```ts
[
    {
        id: string
        label: string
        description?: string
        border?: boolean        // visual separator in UI
    }
]
```

## GET /filtering_scopes — Response

```ts
[
    {
        id: string          // e.g. "clinical", "non_clinical"
        label: string
        description: string
    }
]
```

## GET /filtering_qualifiers — Response

```ts
[
    {
        id: string          // e.g. "observation"
        label: string
        description: string
        values: string[]    // e.g. ["confirmed", "candidate"]
        groups: string[]    // filter group ids this qualifier applies to
    }
]
```

## GET /filtering_terms/{field_id}/values — Query parameters

| Param | Type | Notes |
|---|---|---|
| `scope` | string | Omit when `"all"`. Values: `"clinical"`, `"non_clinical"` |
| `qualifier` | repeated string | Each entry: `"id:value"` e.g. `"observation:confirmed"`. FastAPI expects repeated keys — Axios must use `paramsSerializer: { indexes: null }` |

Response:

```ts
// list ordered by count desc
[
    {
        value: string           // display label or SNOMED preferred term
        count: number
        concept_id: string | null  // set for ontology fields, null for free-text
    }
]
```

## GET /filtering_terms/{field_id}/suggestions — Query parameters

| Param | Type | Notes |
|---|---|---|
| `term` | string | User's search string (min 2 chars before firing) |
| `word_match` | `"true"` | Always sent |
| `scope` | string | Omit when `"all"`. Values: `"clinical"`, `"non_clinical"` |
| `qualifier` | repeated string | Each entry: `"id:value"` e.g. `"observation:confirmed"`. FastAPI expects repeated keys — Axios must use `paramsSerializer: { indexes: null }` |

Response: same shape as `/values`. First call may be slow (Snowstorm cold cache) — always show loading state. `ontologyOrValue` fields return both SNOMED concepts and free-text values in the same list.

## POST /datasets, POST /images — Request

```ts
{
    query: {
        filters: [
            { id: "sex",               value: "Female",      operator: "=" },
            { id: "animal_species",    value: ["337915000"], operator: "=" },
            { id: "age_at_extraction", value: "P40Y-P50Y",   operator: "=" }
        ],
            requestedGranularity: "record" | "count",
            requestedScope?: string,            // "clinical" | "non_clinical" — omit for all data
            requestedQualifiers?: {
                [qualifierId: string]: string[]   // e.g. { observation: ["confirmed"] }
    }
    }
}
```

Filter logic: different fields → AND, multiple values on same field → OR. `includeDescendantTerms` is not sent — backend auto-expands SNOMED descendants. `iso8601Range` value format: `"P40Y-P50Y"`.

There are two API functions for the two search paths — `postQuery` (calls `/datasets`, clinical, record granularity) and `postNonClinicalQuery` (calls `/images`, always count granularity, always `non_clinical` scope).

## POST /datasets — Response (record granularity)

```ts
{
    meta: {
        apiVersion: string
        beaconId: string
        returnedGranularity: "record"
    }
    responseSummary: {
        exists: boolean
        numTotalResults: number
    }
    response: {
        resultSet: [
            {
                id: string
                setType: "dataset"
                exists: boolean
                results: [
                    {
                        datasetId: string
                        datasetTitle: string | null
                        datasetDescription: string | null
                        datasetUrl: string | null
                        totalImageCount: number
                        matchingImageCount: number
                        imageIds: string[]
                    }
                ]
            }
        ]
    }
}
```

`accessionId` is not yet in the backend response — `datasetId` is used as REMS resource fallback.

## POST /images — Response (count granularity)

No `resultSet` — non-clinical results show only aggregate image count.

```ts
{
    meta: {
        apiVersion: string
        beaconId: string
        returnedGranularity: "count"
    }
    responseSummary: {
        exists: boolean
        numTotalResults: number
    }
}
```

## GET /status — Response

```ts
{
    deployment: string
    documents: { indexed: number; pending: number }
    scopes: Record<string, { documents: { indexed: number; pending: number } }>  // keyed by scope id, e.g. "clinical" / "non_clinical"
    last_indexed: string | null  // ISO 8601 datetime, or null
}
```

Consumed via `getStatus()` in `services/api.ts` and the `useDeploymentStatus` composable (`queryKey: ['deploymentStatus']`). Rendered by `<DeploymentStatusBar>` — one stat per scope from `/filtering_scopes`, using `scopes[scope.id].documents.indexed`.

## Request Access

"Apply for access" opens REMS in a new tab with `datasetId` as the resource parameter. Bulk selection appends multiple resource params to the same URL via `URLSearchParams`.