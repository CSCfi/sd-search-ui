export function buildRemsUrl(accession: string | string[]): string {
  const base = `${import.meta.env.VITE_REMS_URL}/apply-for`
  if (Array.isArray(accession)) {
    const params = new URLSearchParams()
    accession.forEach((id) => params.append('resource', id))
    return `${base}?${params.toString()}`
  }
  return `${base}?resource=${accession}`
}
