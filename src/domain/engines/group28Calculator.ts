import { addInstallmentPeriod, daysBetween, formatDueDate, parseLocalDate } from '../../utils/dates'
import { round2 } from './financialMath'
import type { CreditInput, Group28ScheduleResult, Group28ScheduleRow, ValidationErrors } from '../schedule/scheduleTypes'

// Método estimado mediante ingeniería inversa de cronogramas reales. No es
// una fórmula oficial publicada por ADRA. Este motor es exclusivo del crédito
// con periodicidad fija de 28 días.

const CONTRIBUTION_RATE = 0.1
const LIFE_INSURANCE_PER_INSTALLMENT = 1.2
const MIN_INSTALLMENTS = 2
const MAX_INSTALLMENTS = 60
const BINARY_SEARCH_ITERATIONS = 240

/** Base efectiva en días estimada para la TEM expresada como porcentaje. */
export function group28EffectiveDayBase(monthlyRatePct: number): number {
  return 0.03423868 * monthlyRatePct * monthlyRatePct - 0.165577 * monthlyRatePct + 30.99233657
}

function rateForInstallment(installmentNumber: number, firstRate: number, regularRate: number): number {
  return installmentNumber === 1 ? firstRate : regularRate
}

/** Resuelve la cuota constante cuando el primer periodo tiene una tasa distinta. */
export function solveGroup28Payment(
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

    for (let index = 0; index < installments; index += 1) {
      const rate = index === 0 ? firstRate : regularRate
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
  const { amount, installments, monthlyRate, disbursementDate, firstDueDate } = input
  const monthlyRateDecimal = monthlyRate / 100
  const disbursement = parseLocalDate(disbursementDate)
  const firstDate = parseLocalDate(firstDueDate)
  const baseDays = group28EffectiveDayBase(monthlyRate)
  const firstRate = (1 + monthlyRateDecimal) ** (daysBetween(disbursement, firstDate) / baseDays) - 1
  const regularRate = (1 + monthlyRateDecimal) ** (28 / baseDays) - 1
  const theoreticalPayment = solveGroup28Payment(amount, installments, firstRate, regularRate)
  const scheduledPayment = Math.ceil(theoreticalPayment - 1e-10)

  const contributionTotal = round2(amount * CONTRIBUTION_RATE)
  const contributionBase = Math.ceil(contributionTotal / installments)
  let remainingContribution = contributionTotal
  let balance = amount
  const rows: Group28ScheduleRow[] = []

  for (let number = 1; number <= installments; number += 1) {
    const isLast = number === installments
    const rate = rateForInstallment(number, firstRate, regularRate)
    const interestCharges = round2(balance * rate)
    let installmentTotal: number
    let principal: number

    if (isLast) {
      principal = round2(balance)
      installmentTotal = round2(principal + interestCharges)
      balance = 0
    } else {
      installmentTotal = scheduledPayment
      principal = round2(installmentTotal - interestCharges)
      balance = round2(balance - principal)
    }

    const contribution = isLast
      ? round2(remainingContribution)
      : Math.min(contributionBase, remainingContribution)
    remainingContribution = round2(remainingContribution - contribution)
    const dueDate = addInstallmentPeriod(firstDate, number - 1)

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

  return {
    rows,
    totals,
    lifeInsurance: round2(installments * LIFE_INSURANCE_PER_INSTALLMENT),
    scheduledPayment,
  }
}
