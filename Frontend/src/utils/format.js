export function formatPrice(value) {
  const n = Number(value)
  if (value == null || Number.isNaN(n) || n <= 0) return null
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export function formatPriceOrTBD(value) {
  return formatPrice(value) || 'Prix sur demande'
}
