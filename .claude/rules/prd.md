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
2. Researcher fills in search filters describing their criteria
   (e.g. human tissue, lung, specific staining method, age range)
3. Researcher submits the search and sees matching datasets with image counts
4. Researcher reviews dataset descriptions and decides which datasets are relevant
5. Researcher requests access to selected datasets via REMS
6. After approval, researcher gains access to images in BigPicture

## Search Filters

Filters follow the PICO research query model adapted for digital pathology:

| Filter | Description | Example |
|---|---|---|
| Dataset description | Free-text search in dataset titles and descriptions | "lung carcinoma" |
| Biological species | Species of the biological sample | Human, Mouse |
| Anatomical site | Organ or body structure the sample was taken from | Lung, Breast, Kidney |
| Sex | Biological sex of the donor | Male, Female |
| Age at extraction | Age of the donor at time of sample extraction | 40–60 years |
| Fixation type | How the tissue was preserved | FFPE, Fresh frozen |
| Block preparation | Embedding medium used | Paraffin, OCT |
| Specimen type | Type of biological specimen | Tissue section |
| Staining | Staining procedure, compound, or target | H&E, IHC, pan-Cytokeratin |

Multiple values within the same filter are combined with OR.
Multiple different filters are combined with AND.

## Results

Search results show matching datasets, not individual images. Per dataset:
- Dataset title and description
- Number of matching images / total images in dataset
- Button to request access

## Access Request

Clicking "Request access" opens the REMS (Resource Entitlement Management System)
application form in a new tab. Access approval is handled outside CSC Discovery.

## Out of Scope (current version)

- Cart / bulk access requests
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