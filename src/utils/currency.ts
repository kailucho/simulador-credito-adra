/** Formats a number using the es-PE locale with exactly 2 decimal digits (no currency symbol). */
export function formatMoney(value: number): string {
  return value.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
