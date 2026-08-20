---
description: Product requirements, user journey, scope. Read when making product or architectural decisions.
alwaysApply: false
---

# CSC Discovery — Product Requirements Document

## Problem

Biomedical researchers need access to whole-slide pathology images for research purposes.
BigPicture (bp.nbis.se) is the EU's central repository for these images, but finding
relevant datasets requires manual browsing without structured search capabilities.

Researchers cannot efficiently answer the question:
**"Does BigPicture contain images that match my research criteria?"**

## Solution

CSC Discovery is a search portal that allows researchers to find pathology image datasets
using structured filters and request access to relevant images.

## Target Users

Biomedical researchers at universities and research institutions who:
- Work with digital pathology and whole-slide imaging
- Need to find datasets matching specific biological or clinical criteria
- Are affiliated with institutions in the Haka federation (Finnish universities) or
  LifeScience AAI network

## User Journey

1. Researcher logs in via their institutional account (LifeScience AAI)
2. Researcher selects a scope tab (All data / Clinical / Non-clinical) and optionally a qualifier
3. Researcher fills in search filters describing their criteria
   (e.g. human tissue, lung, specific staining method, age range)
4. Researcher submits the search and sees matching datasets with image counts
5. For clinical data: researcher reviews dataset list, selects relevant datasets, requests access via REMS
6. For non-clinical data: researcher sees a total matching image count and applies for access as a virtual dataset
7. After approval, researcher gains access to images in BigPicture

## Search Filters

Filters follow the PICO research query model adapted for digital pathology. The actual field list
is backend-driven (`GET /filtering_terms`) — the table below reflects the current `fields.yaml`.

| Field id | Label | Scope | Type |
|---|---|---|---|
| `dataset_description` | Dataset description | clinical + non_clinical | text |
| `animal_species` | Biological species | non_clinical | ontology |
| `anatomical_site` | Anatomical site | clinical + non_clinical | ontology |
| `sex` | Sex | clinical + non_clinical | controlledValue |
| `age_at_extraction` | Age at extraction | clinical + non_clinical | iso8601Range |
| `block_preparation` | Block preparation | clinical + non_clinical | ontology |
| `specimen_type` | Specimen type | clinical + non_clinical | ontology |
| `fixation_type` | Fixation type | clinical + non_clinical | ontologyOrValue |
| `staining_target` | Staining target | clinical + non_clinical | keyword |
| `staining_procedure` | Staining procedure | clinical + non_clinical | ontologyOrValue |
| `staining_substance` | Staining substance | clinical + non_clinical | ontologyOrValue |
| `diagnosis` | Diagnosis | clinical only | ontology (SNOMED CT) |
| `finding` | Finding | non_clinical only | ontology (SEND) |
| `finding_severity` | Severity | non_clinical only | ontology (SEND) |
| `finding_chronicity` | Chronicity | non_clinical only | ontology (SEND) |
| `finding_distribution` | Distribution | non_clinical only | ontology (SEND) |
| `finding_result_category` | Result category | non_clinical only | ontology (SEND) |

`dataset_title` is indexed but `ui_display: false` — not shown in the UI.

Multiple values within the same filter are combined with OR.
Multiple different filters are combined with AND.
At least one filter must be selected before search can be submitted.

## Results

Results are split by data scope:

**Clinical data** — shown as a dataset list. Per dataset:
- Dataset title and description (truncated, expandable via modal)
- Link to dataset details page (`datasetUrl`)
- Number of matching images / total images in dataset
- Checkbox for bulk selection
- Button to apply for access via REMS

Multiple datasets can be selected and submitted as a single bulk REMS application.

**Non-clinical data** — shown as an aggregate count only. No dataset identity is exposed.
- Total matching image count
- Button to apply for access (implementation pending)

## Access Request

Clicking "Apply for access" opens REMS (Resource Entitlement Management System) in a new tab.
Bulk selection appends multiple `resource` params to the same REMS URL. Access approval is
handled outside CSC Discovery.

## Out of Scope (current version)

- Viewing images directly in the portal
- Search history
- Access status tracking
- Multilingual UI
- User profile management

## Success Criteria

- Researcher can find relevant datasets in under 2 minutes
- Search correctly filters by all supported criteria
- Access request flow is clear and unambiguous

## Data Source

All data originates from BigPicture XML exports, ingested via a backend pipeline into
OpenSearch. The frontend queries the Search API (Beacon V2 protocol) — it has no direct
connection to BigPicture or PostgreSQL.