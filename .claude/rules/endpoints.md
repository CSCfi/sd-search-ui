---
description: API endpoints, query format, response types. Read when working on API calls, services, or data fetching.
alwaysApply: false
---

# CSC Discovery — API Endpoints

## Base URL

```
VITE_API_BASE_URL (env)
http://localhost:8000  (dev default)
```

Swagger UI: `http://localhost:8000/docs`

## Endpoints

| Method | Path | Description | Cache |
|---|---|---|---|
| GET | `/filtering_terms` | All filter field definitions — static list | `staleTime: Infinity` |
| GET | `/filtering_terms/{field_id}/values` | Field values with counts | `staleTime: 4h` |
| GET | `/filtering_terms/{field_id}/suggestions?term=xxx` | Autocomplete | no cache |
| POST | `/query` | Beacon V2 search | per query key |
| GET | `/health` | Health check | — |

## Filter Field Types → UI Components

| `type` | Component | Fields                                                                    |
|---|---|---------------------------------------------------------------------------|
| `text` | `<TextInput>` | `dataset_title`, `dataset_description`, `staining_target`                 |
| `controlledValue` | `<MultiSelect>` | `sex`                                                                     |
| `ontology` | `<MultiSelect>` | `anatomical_site`, `animal_species`, `specimen_type`, `block_preparation` |
| `ontologyOrValue` | `<MultiSelect>` | `fixation_type`, `staining_procedure`, `staining_substance`               |
| `iso8601Range` | `<RangePicker>` | `age_at_extraction`                                                       |

## POST /query — Request

```ts
{
  query: {
    filters: [
      { id: "sex",               value: "Female",     operator: "="},
      { id: "animal_species",    value: ["337915000"], operator: "=", includeDescendantTerms: true },
      { id: "age_at_extraction", value: "P40Y-P50Y",  operator: "=" }
    ],
    requestedGranularity: "record"
  }
}
```

**Logic:**
- Multiple different fields → **AND**
- Multiple values in same field → **OR** (multiselect)
- Ontology fields: `value` is SNOMED CT concept ID e.g. `"337915000"` (Homo sapiens)
- `iso8601Range`: `value` is `"P40Y-P50Y"` — backend converts to days internally
- Backend auto-expands SNOMED descendants — frontend sends exact concept ID only

## POST /query — Response (record)

```ts
{
  meta: {
    apiVersion: string
    beaconId: string
    returnedGranularity: "record"
  },
  responseSummary: {
    exists: boolean
    numTotalResults: number   // number of matching datasets
  },
  response: {
    resultSet: [
      {
        id: string            // datasetId
        setType: "dataset"
        exists: boolean
        results: [
          {
            datasetId: string
            datasetTitle: string | null
            datasetDescription: string | null
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
                type: "text" | "controlledValue" | "ontology" | "ontologyOrValue" | "iso8601Range"
                label: string                       // e.g. "Anatomical site"
                description: string
                scopes: string[]                    // e.g. ["specimen"]
                ontology?: {
                    id: string                        // always "SCTID"
                    rootTerms?: string[] | null
                    allowedTerms?: string[] | null
                }
                ontologyConcept?: string | string[] // root SNOMED concept(s)
                controlledValues?: string[]         // only for type="controlledValue"
            }
        ]
    }
}
```

## GET /filtering_terms/{field_id}/values — Response

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

## GET /filtering_terms/{field_id}/suggestions — Response

```ts
// query param: ?term=lun&word_match=true
[
    {
        term: string            // display label e.g. "Lung structure"
        concept_id: string | null  // SNOMED ID if ontology match, null if free-text
    }
]
```

**Note:** First call may be slow (Snowstorm cold cache). Always show loading state.
`ontologyOrValue` fields return both SNOMED concepts and free-text values in same list.

## Request Access

Results show "Request access" per dataset — opens REMS:

```ts
window.open(
    `https://bp-rems.sd.csc.fi/apply-for?resource=${datasetId}`,
    '_blank',
    'noopener,noreferrer'
)
```

**Note:** `accessionId` not yet in backend response — using `datasetId` as fallback.
Update when backend adds `accessionId` to `BeaconResultSetResult`.