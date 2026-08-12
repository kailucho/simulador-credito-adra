// Utilidades de redondeo/quantization compartidas por los motores
// financieros. Centralizadas aquí para que ninguna fórmula duplique reglas
// de redondeo por su cuenta.

/** Redondeo estándar (HALF_UP) a 2 decimales. Nunca duplicar esta regla en otro lugar. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
