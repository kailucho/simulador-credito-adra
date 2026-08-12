import { formatDueDate, parseLocalDate } from '../../utils/dates'
import { effectiveMonthlyDueDate, nominalMonthlyDate } from '../../utils/peruBusinessCalendar'
import { round2 } from './financialMath'
import type { CreditInput, MonthlyScheduleResult, MonthlyScheduleRow, ValidationErrors } from '../schedule/scheduleTypes'

// Motor financiero mensual único, compartido por todos los productos que lo
// usan (ver el catálogo de productos para saber cuáles).
//
// IMPORTANTE (regla de diseño obligatoria): este archivo NO debe importar
// nada del catálogo de productos, NO debe contener ningún identificador de
// producto, y NO debe leer datos de prueba. Toda diferencia entre
// productos se resuelve exclusivamente con los parámetros de CreditInput
// (monto, cuotas, tasa, fechas, día nominal). Ver
// src/tests/monthlyEngineIsolation.test.ts, que lo verifica de forma
// estática.
//
// La fórmula de interés y su brecha de exactitud conocida frente a los
// cronogramas reales de referencia están documentadas por separado (ver
// carpeta de investigación en la raíz del repo) — no se debe "cerrar" esa
// brecha con offsets por fila ni por producto.

const COVERAGE_FUND_RATE_DEFAULT = 0.09309 // % — ver defaultCreditInput / productCatalog para el valor mostrado en UI

const MIN_INSTALLMENTS = 1
const MAX_INSTALLMENTS = 60

const BINARY_SEARCH_ITERATIONS = 200

/**
 * Tasa de interés del periodo dado un número de días efectivos. Convención:
 * interés a rebatir con base de 30 días por mes. Ver
 * docs/reverse-engineering/findings.md sección 3 para la justificación y
 * la brecha de exactitud conocida frente a las 51 cuotas de referencia.
 */
export function periodInterestRate(monthlyRateDecimal: number, effectiveDays: number): number {
  return (1 + monthlyRateDecimal) ** (effectiveDays / 30) - 1
}

/**
 * Fondo de cobertura del periodo: saldo actual × tasa de cobertura ×
 * cantidad de meses nominales cruzados por el periodo (mínimo 1). Ver
 * docs/reverse-engineering/findings.md sección 1.3.
 */
export function coverageFundAmount(balance: number, coverageFundRateDecimal: number, nominalMonthsCrossed: number): number {
  return balance * coverageFundRateDecimal * nominalMonthsCrossed
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function monthsCrossed(a: Date, b: Date): number {
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  return Math.max(1, months)
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
  const nominalDay = input.nominalPaymentDay ?? parseLocalDate(input.firstDueDate).getDate()
  const firstDue = parseLocalDate(input.firstDueDate)
  const disbursement = parseLocalDate(input.disbursementDate)
  const monthlyRateDecimal = monthlyRate / 100
  const coverageFundRateDecimal = COVERAGE_FUND_RATE_DEFAULT / 100

  // Fechas nominales/efectivas de cada cuota, resueltas una sola vez.
  const nominalDates: Date[] = []
  const effectiveDates: Date[] = []
  for (let number = 1; number <= installments; number += 1) {
    nominalDates.push(nominalMonthlyDate(firstDue, nominalDay, number))
    effectiveDates.push(effectiveMonthlyDueDate(firstDue, nominalDay, number))
  }

  // Cuota fija: búsqueda binaria del pago constante que amortiza el monto
  // usando la misma fórmula de interés y las mismas fechas efectivas del
  // cronograma (el fondo de cobertura se resta del pago fijo igual que el
  // interés, ya que ambos reducen el capital amortizado por cuota).
  let low = 0
  let high = amount * 2
  for (let iteration = 0; iteration < BINARY_SEARCH_ITERATIONS; iteration += 1) {
    const payment = (low + high) / 2
    let balance = amount
    let prevDate = disbursement

    for (let index = 0; index < installments; index += 1) {
      const days = daysBetween(prevDate, effectiveDates[index])
      const rate = periodInterestRate(monthlyRateDecimal, days)
      const interest = balance * rate
      const months = monthsCrossed(prevDate, effectiveDates[index])
      const coverage = coverageFundAmount(balance, coverageFundRateDecimal, months)
      balance = balance + interest + coverage - payment
      prevDate = effectiveDates[index]
    }

    if (balance > 0) {
      low = payment
    } else {
      high = payment
    }
  }

  // La cuota se redondea al sol entero superior (igual convención que
  // GROUP_28: Math.ceil sobre el pago teórico), salvo créditos de una sola
  // cuota donde no hay "pago recurrente" que redondear — esa única cuota
  // simplemente liquida el saldo (ver rows loop, rama isLast).
  const scheduledPayment = installments === 1 ? high : Math.ceil(high)

  // Cronograma final con la cuota fija ya determinada.
  let balance = amount
  let prevDate = disbursement
  const rows: MonthlyScheduleRow[] = []

  for (let index = 0; index < installments; index += 1) {
    const isLast = index === installments - 1
    const dueDate = effectiveDates[index]
    const days = daysBetween(prevDate, dueDate)
    const rate = periodInterestRate(monthlyRateDecimal, days)
    const interestCharges = round2(balance * rate)
    const months = monthsCrossed(prevDate, dueDate)
    const coverageFund = round2(coverageFundAmount(balance, coverageFundRateDecimal, months))

    let principal: number
    let total: number

    if (isLast) {
      principal = round2(balance)
      total = round2(principal + interestCharges + coverageFund)
    } else {
      principal = round2(scheduledPayment - interestCharges - coverageFund)
      total = scheduledPayment
    }

    rows.push({
      installmentNumber: index + 1,
      dueDate,
      dueDateLabel: formatDueDate(dueDate),
      principal,
      interestCharges,
      coverageFund,
      total,
    })

    balance = round2(balance - principal)
    prevDate = dueDate
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
