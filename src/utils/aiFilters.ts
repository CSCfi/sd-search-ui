import type { AIFilter, BeaconFilteringTermType, FieldValue } from '@/types/beacon'
import type { DatasetType } from '@/stores/searchStore'
import { resolveConceptLabels } from '@/utils/conceptLabels'

const DURATION_RE = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/
const SINGLE_UNIT_RANGE_RE = /^P(\d+)([YMWD])-P(\d+)\2$/

// Same factors as the backend (opensearch/clauses.py), so a converted range stays close to
// what the backend would have computed for the original.
const DAYS_PER_YEAR = 365
const DAYS_PER_MONTH = 30
const DAYS_PER_WEEK = 7

interface ParsedDuration {
  years: number
  months: number
  weeks: number
  days: number
}

function parseDuration(raw: string): ParsedDuration | null {
  const m = DURATION_RE.exec(raw)
  // `P` alone matches the pattern with every group empty.
  if (!m || raw === 'P') return null
  const [, y, mo, w, d] = m
  return {
    years: Number(y ?? 0),
    months: Number(mo ?? 0),
    weeks: Number(w ?? 0),
    days: Number(d ?? 0),
  }
}

/**
 * Converts an ISO 8601 age value from the backend into the single-unit `PnU-PnU` range that
 * RangePicker can show and edit. Returns `null` when the value cannot be parsed or its lower
 * bound is above its upper bound (RangePicker would silently drop such a filter).
 *
 * - `P40Y-P60Y` (same unit on both sides) passes through unchanged.
 * - `P40Y` becomes `P40Y-P40Y`.
 * - Years and months only: months, or years when both bounds are whole years.
 * - Any weeks or days present: days. Day drift from the 365/30 factors is accepted.
 */
export function normalizeAge(value: string): string | null {
  if (SINGLE_UNIT_RANGE_RE.test(value)) {
    const m = SINGLE_UNIT_RANGE_RE.exec(value)!
    return Number(m[1]) <= Number(m[3]) ? value : null
  }

  const [rawFrom, rawTo = rawFrom] = splitRange(value)
  const from = parseDuration(rawFrom ?? '')
  const to = parseDuration(rawTo ?? '')
  if (!from || !to) return null

  const useDays = [from, to].some((d) => d.weeks > 0 || d.days > 0)
  if (useDays) {
    const toDays = (d: ParsedDuration) =>
      d.years * DAYS_PER_YEAR + d.months * DAYS_PER_MONTH + d.weeks * DAYS_PER_WEEK + d.days
    return formatRange(toDays(from), toDays(to), 'D')
  }

  const fromMonths = from.years * 12 + from.months
  const toMonths = to.years * 12 + to.months
  if (fromMonths % 12 === 0 && toMonths % 12 === 0) {
    return formatRange(fromMonths / 12, toMonths / 12, 'Y')
  }
  return formatRange(fromMonths, toMonths, 'M')
}

function splitRange(value: string): string[] {
  const i = value.indexOf('-')
  return i === -1 ? [value] : [value.slice(0, i), value.slice(i + 1)]
}

function formatRange(from: number, to: number, unit: 'Y' | 'M' | 'D'): string | null {
  return from <= to ? `P${from}${unit}-P${to}${unit}` : null
}

export type ScopeDecision =
  { kind: 'keep' } | { kind: 'switch'; scope: DatasetType } | { kind: 'mixed' }

/**
 * Derives the tab from the scopes of every returned field (intersection of their scopes).
 * - empty intersection: the text mixes clinical-only and non-clinical-only fields
 * - covers every backend scope: only shared fields, the active tab stays
 * - otherwise: switch to the scope when the active tab is not in the intersection
 *
 * Fields missing from `fieldScopes` are ignored. Returns `keep` when no field has scopes.
 */
export function deriveScope(
  fieldIds: string[],
  fieldScopes: Map<string, string[]>,
  allScopeIds: string[],
  activeTab: DatasetType,
): ScopeDecision {
  const scopeLists = fieldIds
    .map((id) => fieldScopes.get(id))
    .filter((scopes): scopes is string[] => scopes !== undefined)
  if (scopeLists.length === 0) return { kind: 'keep' }

  const intersection = allScopeIds.filter((scope) => scopeLists.every((s) => s.includes(scope)))
  if (intersection.length === 0) return { kind: 'mixed' }
  if (intersection.length === allScopeIds.length) return { kind: 'keep' }
  if (activeTab !== 'all' && intersection.includes(activeTab)) return { kind: 'keep' }
  return { kind: 'switch', scope: intersection[0] as DatasetType }
}

export interface StoreFilter {
  id: string
  value: string | string[]
  labels?: string[]
  includeDescendantTerms?: boolean
}

const asArray = (value: string | string[]) => (Array.isArray(value) ? value : [value])

// One value, whether the backend sent it as a string or as a one-item list.
const single = (value: string | string[]): string | null => {
  const list = asArray(value)
  return list.length === 1 ? (list[0] ?? null) : null
}

/**
 * Maps one backend filter to the arguments of `searchStore.setFilter`, in the shape the
 * matching field component would have produced itself. Returns `null` when the value is
 * invalid for the field type (age that cannot be shown, several values on a text or age field).
 *
 * `values` is the field's `/values` list, used only to label ontology concept ids.
 * `knownLabels` (concept id -> label, from the current draft) wins over `values`.
 * `operator` and `includeDescendantTerms` from the backend are ignored.
 */
export function toStoreFilter(
  type: BeaconFilteringTermType,
  filter: AIFilter,
  values: FieldValue[] = [],
  knownLabels: ReadonlyMap<string, string> = new Map(),
): StoreFilter | null {
  const { id, value } = filter
  switch (type) {
    case 'text': {
      const text = single(value)
      return text === null ? null : { id, value: text }
    }
    case 'controlledValue':
      return { id, value }
    case 'iso8601Range': {
      const raw = single(value)
      const age = raw === null ? null : normalizeAge(raw)
      return age === null ? null : { id, value: age }
    }
    case 'keyword': {
      const list = asArray(value)
      return { id, value: list, labels: list }
    }
    case 'ontology':
    case 'ontologyOrValue': {
      const list = asArray(value)
      return {
        id,
        value: list,
        labels: resolveConceptLabels(list, values).map((l, i) => knownLabels.get(list[i]!) ?? l),
        includeDescendantTerms: true,
      }
    }
    default:
      return null
  }
}
