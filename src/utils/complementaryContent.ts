export type ComplementaryContentType = 'image' | 'observation' | 'annotation'

const ORDER: ComplementaryContentType[] = ['image', 'observation', 'annotation']

const LABELS: Record<ComplementaryContentType, string> = {
  image: 'Images',
  observation: 'Observations',
  annotation: 'Annotations',
}

function isComplementaryContentType(value: string): value is ComplementaryContentType {
  return (ORDER as string[]).includes(value)
}

export function complementaryContentLabels(resourceTypes: string[]): string[] {
  const recognized = new Set(resourceTypes.filter(isComplementaryContentType))
  return ORDER.filter((type) => recognized.has(type)).map((type) => LABELS[type])
}
