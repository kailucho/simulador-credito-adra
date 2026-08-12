// Calendario peruano simplificado, aislado deliberadamente de la matemática
// financiera (ver src/domain/engines) para poder testearlo de forma
// independiente y para que el motor mensual nunca necesite conocer reglas de
// feriados/fines de semana.
//
// Regla usada por los productos MONTHLY_COMMON: cada cuota tiene un "día
// contractual/nominal" fijo. Si la fecha nominal del mes cae en día no
// hábil, la fecha MOSTRADA se mueve hacia adelante hasta el siguiente día
// hábil. La cuota siguiente vuelve a calcularse desde el día nominal
// original (no arrastra el corrimiento).

// Feriados nacionales fijos relevantes para el rango de fechas de las
// muestras de referencia (2025-2027). No pretende ser un calendario oficial
// completo; se documenta explícitamente para que sea auditable y ampliable.
const FIXED_HOLIDAYS_MM_DD = new Set([
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '06-29', // San Pedro y San Pablo
  '07-28', // Fiestas Patrias
  '07-29', // Fiestas Patrias
  '08-30', // Santa Rosa de Lima
  '10-08', // Combate de Angamos
  '11-01', // Todos los Santos
  '12-08', // Inmaculada Concepción
  '12-25', // Navidad
])

function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function isFixedHoliday(date: Date): boolean {
  const key = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
  return FIXED_HOLIDAYS_MM_DD.has(key)
}

/** Domingo de Pascua para un año dado (algoritmo de Gauss/anónimo, calendario gregoriano). */
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** Jueves Santo y Viernes Santo (feriados móviles peruanos ligados a la Pascua). */
function isMovableHoliday(date: Date): boolean {
  const easter = easterSunday(date.getFullYear())
  const juevesSanto = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 3)
  const viernesSanto = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2)
  return sameDay(date, juevesSanto) || sameDay(date, viernesSanto)
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** True si la fecha es sábado, domingo, feriado nacional fijo o feriado móvil (Semana Santa). */
export function isNonBusinessDay(date: Date): boolean {
  return isWeekend(date) || isFixedHoliday(date) || isMovableHoliday(date)
}

/** Avanza `date` al siguiente día hábil (inclusive) según isNonBusinessDay. */
export function nextBusinessDay(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  while (isNonBusinessDay(result)) {
    result.setDate(result.getDate() + 1)
  }
  return result
}

/**
 * Construye la fecha nominal de la cuota `installmentNumber` (1-indexed) a
 * partir del mes/año de la primera cuota y el día contractual fijo, sumando
 * meses calendario. El día contractual se clampa al último día del mes si
 * el mes de destino tiene menos días.
 */
export function nominalMonthlyDate(firstDueDate: Date, nominalDay: number, installmentNumber: number): Date {
  const monthIndex = firstDueDate.getMonth() + (installmentNumber - 1)
  const year = firstDueDate.getFullYear() + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  const day = Math.min(nominalDay, lastDayOfMonth)
  return new Date(year, month, day)
}

/** Fecha nominal ajustada al siguiente día hábil si corresponde. */
export function effectiveMonthlyDueDate(firstDueDate: Date, nominalDay: number, installmentNumber: number): Date {
  return nextBusinessDay(nominalMonthlyDate(firstDueDate, nominalDay, installmentNumber))
}
