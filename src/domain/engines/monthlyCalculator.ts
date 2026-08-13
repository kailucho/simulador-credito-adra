import { daysBetween, formatDueDate, parseLocalDate } from '../../utils/dates'
import { effectiveMonthlyDueDate, nominalMonthlyDate } from '../../utils/peruBusinessCalendar'
import { round2 } from './financialMath'
import type { CreditInput, MonthlyScheduleResult, MonthlyScheduleRow, ValidationErrors } from '../schedule/scheduleTypes'

// Motor financiero mensual único. No conoce productos ni datos de prueba:
// todas las diferencias llegan exclusivamente mediante CreditInput.
// Método estimado mediante ingeniería inversa de cronogramas reales.

export const COVERAGE_RATE = 0.0009309

// Calibración usada únicamente para resolver la cuota teórica. Fue estimada
// mediante ingeniería inversa; no representa ni debe presentarse como IGV.
const INTERNAL_COVERAGE_FACTOR = 1.18

const MIN_INSTALLMENTS = 1
const MAX_INSTALLMENTS = 60
const BINARY_SEARCH_ITERATIONS = 260

/** TEM convertida a tasa efectiva para una cantidad real de días. */
export function periodInterestRate(monthlyRateDecimal: number, accrualDays: number): number {
  return (1 + monthlyRateDecimal) ** (accrualDays / 30) - 1
}

/** Fondo visible: saldo por tasa y cantidad de periodos mensuales cubiertos. */
export function coverageFundAmount(balance: number, coverageRate: number, coverageMonths: number): number {
  return balance * coverageRate * coverageMonths
}

export function monthDiff(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

/** Número de periodos nominales cubiertos por una cuota (mínimo uno). */
export function getCoverageMonths(
  disbursementDate: Date,
  nominalDates: readonly Date[],
  installmentIndex: number,
): number {
  const previous = installmentIndex === 0 ? disbursementDate : nominalDates[installmentIndex - 1]
  return Math.max(1, monthDiff(previous, nominalDates[installmentIndex]))
}

/**
 * Resuelve la cuota constante con fechas nominales y el costo de cobertura
 * interno estimado. El factor interno no se usa en las filas visibles.
 */
export function solveMonthlyPayment(
  amount: number,
  installments: number,
  monthlyRateDecimal: number,
  disbursementDate: Date,
  nominalDates: readonly Date[],
): number {
  let low = 0
  let high = amount * 2

  for (let iteration = 0; iteration < BINARY_SEARCH_ITERATIONS; iteration += 1) {
    const payment = (low + high) / 2
    let balance = amount

    for (let index = 0; index < installments; index += 1) {
      const previous = index === 0 ? disbursementDate : nominalDates[index - 1]
      const days = daysBetween(previous, nominalDates[index])
      const interest = balance * periodInterestRate(monthlyRateDecimal, days)
      const coverageMonths = getCoverageMonths(disbursementDate, nominalDates, index)
      const internalCoverage = balance * COVERAGE_RATE * coverageMonths * INTERNAL_COVERAGE_FACTOR
      const principal = payment - interest - internalCoverage
      balance -= principal
    }

    if (balance > 0) {
      low = payment
    } else {
      high = payment
    }
  }

  return high
}

export function validateMonthlyInput(input: CreditInput): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = 'El monto debe ser mayor que cero.'
  }

  if (!Number.isFinite(input.monthlyRate) || input.monthlyRate <= 0) {
    errors.monthlyRate = 'La tasa mensual debe ser mayor que cero.'
  }

  if (!Number.isInteger(input.installments)) {
    errors.installments = 'El número de cuotas debe ser un número entero.'
  } else if (input.installments < MIN_INSTALLMENTS) {
    errors.installments = `El número de cuotas debe ser al menos ${MIN_INSTALLMENTS}.`
  } else if (input.installments > MAX_INSTALLMENTS) {
    errors.installments = `El número de cuotas no puede superar ${MAX_INSTALLMENTS}.`
  }

  if (!input.disbursementDate) {
    errors.disbursementDate = 'La fecha de desembolso es requerida.'
  }

  if (!input.firstDueDate) {
    errors.firstDueDate = 'La fecha de la primera cuota es requerida.'
  }

  if (!input.nominalPaymentDay || input.nominalPaymentDay < 1 || input.nominalPaymentDay > 31) {
    errors.nominalPaymentDay = 'El día contractual de pago debe estar entre 1 y 31.'
  }

  if (input.disbursementDate && input.firstDueDate) {
    const disbursement = parseLocalDate(input.disbursementDate)
    const firstDue = parseLocalDate(input.firstDueDate)
    if (firstDue.getTime() < disbursement.getTime()) {
      errors.firstDueDate = 'La primera cuota no puede ser anterior a la fecha de desembolso.'
    }
  }

  return errors
}

export function calculateMonthlySchedule(input: CreditInput): MonthlyScheduleResult {
  const { amount, installments, monthlyRate } = input
  const firstDue = parseLocalDate(input.firstDueDate)
  const disbursement = parseLocalDate(input.disbursementDate)
  const nominalDay = input.nominalPaymentDay ?? firstDue.getDate()
  const monthlyRateDecimal = monthlyRate / 100

  const nominalDates: Date[] = []
  const effectiveDates: Date[] = []
  for (let number = 1; number <= installments; number += 1) {
    nominalDates.push(nominalMonthlyDate(firstDue, nominalDay, number))
    effectiveDates.push(effectiveMonthlyDueDate(firstDue, nominalDay, number))
  }

  const theoreticalPayment = solveMonthlyPayment(
    amount,
    installments,
    monthlyRateDecimal,
    disbursement,
    nominalDates,
  )
  const scheduledPayment = installments === 1
    ? theoreticalPayment
    : Math.ceil(theoreticalPayment - 1e-10)

  let balance = amount
  let previousAccrualDate = disbursement
  const rows: MonthlyScheduleRow[] = []

  for (let index = 0; index < installments; index += 1) {
    const isLast = index === installments - 1
    const nominalDueDate = nominalDates[index]
    const effectiveDueDate = effectiveDates[index]

    // Punto de extensión: cuando exista evidencia suficiente, accrualDate y
    // accrualDays podrán venir de una fuente separada de la fecha visible.
    const accrualDate = effectiveDueDate
    const accrualDays = daysBetween(previousAccrualDate, accrualDate)
    const interestCharges = round2(balance * periodInterestRate(monthlyRateDecimal, accrualDays))
    const coverageMonths = getCoverageMonths(disbursement, nominalDates, index)
    const coverageFund = round2(coverageFundAmount(balance, COVERAGE_RATE, coverageMonths))

    let principal: number
    let total: number

    if (isLast) {
      principal = round2(balance)
      total = round2(principal + interestCharges + coverageFund)
      balance = 0
    } else {
      principal = round2(scheduledPayment - interestCharges - coverageFund)
      total = scheduledPayment
      balance = round2(balance - principal)
    }

    rows.push({
      installmentNumber: index + 1,
      nominalDueDate,
      effectiveDueDate,
      accrualDate,
      accrualDays,
      dueDate: effectiveDueDate,
      dueDateLabel: formatDueDate(effectiveDueDate),
      principal,
      interestCharges,
      coverageFund,
      total,
    })

    previousAccrualDate = accrualDate
  }

  const totals = rows.reduce(
    (accumulator, row) => ({
      principal: round2(accumulator.principal + row.principal),
      interestCharges: round2(accumulator.interestCharges + row.interestCharges),
      coverageFund: round2(accumulator.coverageFund + row.coverageFund),
      total: round2(accumulator.total + row.total),
    }),
    { principal: 0, interestCharges: 0, coverageFund: 0, total: 0 },
  )

  return { rows, totals, scheduledPayment }
}
