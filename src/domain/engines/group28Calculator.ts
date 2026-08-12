import { addInstallmentPeriod, formatDueDate, parseLocalDate } from '../../utils/dates'
import { round2 } from './financialMath'
import type { CreditInput, Group28ScheduleResult, Group28ScheduleRow, ValidationErrors } from '../schedule/scheduleTypes'

// NOTE: These constants were derived through reverse engineering of real ADRA
// schedules provided as reference material. They are NOT an official ADRA
// formula — see the disclaimer shown in the UI (PaymentReference component).
// Este motor es EXCLUSIVO del producto Crédito Grupal Normal 28 días y
// preserva exactamente el comportamiento verificado antes del refactor
// multiproducto (ver src/tests/group28Calculator.test.ts).
const FIRST_INSTALLMENT_RATE_FACTOR = 0.8348
const REGULAR_INSTALLMENT_RATE_FACTOR = 0.90046

const CONTRIBUTION_RATE = 0.1
const LIFE_INSURANCE_PER_INSTALLMENT = 1.2

const MIN_INSTALLMENTS = 2
const MAX_INSTALLMENTS = 60

const BINARY_SEARCH_ITERATIONS = 200

function rateForInstallment(installmentNumber: number, firstRate: number, regularRate: number): number {
  return installmentNumber === 1 ? firstRate : regularRate
}

/**
 * Finds, via binary search, the constant theoretical payment that fully
 * amortizes `amount` over `installments` periods, given that the first
 * installment accrues interest at `firstRate` and the rest at `regularRate`.
 */
export function calculateTheoreticalPayment(
  amount: number,
  installments: number,
  firstRate: number,
  regularRate: number,
): number {
  let low = 0
  let high = amount * 2

  for (let iteration = 0; iteration < BINARY_SEARCH_ITERATIONS; iteration += 1) {
    const payment = (low + high) / 2
    let balance = amount

    for (let number = 1; number <= installments; number += 1) {
      const rate = rateForInstallment(number, firstRate, regularRate)
      balance = balance * (1 + rate) - payment
    }

    if (balance > 0) {
      low = payment
    } else {
      high = payment
    }
  }

  return high
}

export function validateGroup28Input(input: CreditInput): ValidationErrors {
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

  if (input.disbursementDate && input.firstDueDate) {
    const disbursement = parseLocalDate(input.disbursementDate)
    const firstDue = parseLocalDate(input.firstDueDate)
    if (firstDue.getTime() < disbursement.getTime()) {
      errors.firstDueDate = 'La primera cuota no puede ser anterior a la fecha de desembolso.'
    }
  }

  return errors
}

export function calculateGroup28Schedule(input: CreditInput): Group28ScheduleResult {
  const { amount, installments, monthlyRate, firstDueDate } = input

  const monthlyRateDecimal = monthlyRate / 100
  const firstRate = monthlyRateDecimal * FIRST_INSTALLMENT_RATE_FACTOR
  const regularRate = monthlyRateDecimal * REGULAR_INSTALLMENT_RATE_FACTOR

  const theoreticalPayment = calculateTheoreticalPayment(amount, installments, firstRate, regularRate)
  const scheduledPayment = Math.ceil(theoreticalPayment)

  const contributionTotal = round2(amount * CONTRIBUTION_RATE)
  const contributionBase = Math.ceil(contributionTotal / installments)
  let remainingContribution = contributionTotal

  const firstDate = parseLocalDate(firstDueDate)

  let balance = amount
  const rows: Group28ScheduleRow[] = []

  for (let number = 1; number <= installments; number += 1) {
    const isLast = number === installments
    const rate = rateForInstallment(number, firstRate, regularRate)

    let interestCharges: number
    let installmentTotal: number
    let principal: number

    if (!isLast) {
      interestCharges = round2(balance * rate)
      installmentTotal = scheduledPayment
      principal = round2(installmentTotal - interestCharges)
      balance = balance * (1 + rate) - installmentTotal
    } else {
      interestCharges = round2(balance * rate)
      installmentTotal = round2(balance * (1 + rate))
      principal = round2(installmentTotal - interestCharges)
      balance = 0
    }

    const contribution = isLast
      ? round2(remainingContribution)
      : Math.min(contributionBase, remainingContribution)
    remainingContribution = round2(remainingContribution - contribution)

    const dueDate = number === 1 ? firstDate : addInstallmentPeriod(firstDate, number - 1)

    rows.push({
      installmentNumber: number,
      dueDate,
      dueDateLabel: formatDueDate(dueDate),
      principal,
      interestCharges,
      installmentTotal,
      contribution,
      total: round2(installmentTotal + contribution),
    })
  }

  const totals = rows.reduce(
    (accumulator, row) => ({
      principal: round2(accumulator.principal + row.principal),
      interestCharges: round2(accumulator.interestCharges + row.interestCharges),
      installmentTotal: round2(accumulator.installmentTotal + row.installmentTotal),
      contribution: round2(accumulator.contribution + row.contribution),
      total: round2(accumulator.total + row.total),
    }),
    { principal: 0, interestCharges: 0, installmentTotal: 0, contribution: 0, total: 0 },
  )

  const lifeInsurance = round2(installments * LIFE_INSURANCE_PER_INSTALLMENT)

  return { rows, totals, lifeInsurance, scheduledPayment }
}
