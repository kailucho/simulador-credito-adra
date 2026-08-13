const SPANISH_WEEKDAY_ABBREVIATIONS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']

const DAYS_BETWEEN_INSTALLMENTS = 28

/**
 * Parses a "YYYY-MM-DD" string into a local Date, avoiding the UTC
 * off-by-one-day shift that `new Date("YYYY-MM-DD")` introduces.
 */
export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Adds the fixed 28-day installment frequency to a date, without any calendar adjustment. */
export function addInstallmentPeriod(date: Date, periods = 1): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() + DAYS_BETWEEN_INSTALLMENTS * periods)
  return result
}

/**
 * Returns the number of calendar days between two local dates.
 * UTC is used only for the subtraction so a daylight-saving transition on
 * the machine running the simulator cannot add or remove an accrual day.
 */
export function daysBetween(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24))
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

/** Formats a date as "MAR 25/08/2026" using the Spanish weekday abbreviation. */
export function formatDueDate(date: Date): string {
  const weekday = SPANISH_WEEKDAY_ABBREVIATIONS[date.getDay()]
  const day = pad2(date.getDate())
  const month = pad2(date.getMonth() + 1)
  const year = date.getFullYear()
  return `${weekday} ${day}/${month}/${year}`
}

/** Formats a date as "DD/MM/YYYY". */
export function formatDate(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`
}

/** Formats a Date's date and time for the "generated at" header, e.g. "04/08/2026 22:55". */
export function formatDateTime(date: Date): string {
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  return `${formatDate(date)} ${time}`
}
