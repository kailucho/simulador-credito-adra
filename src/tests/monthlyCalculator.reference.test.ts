import { describe, expect, it } from 'vitest'
import {
  calculateMonthlySchedule,
  getCoverageMonths,
} from '../domain/engines/monthlyCalculator'
import { round2 } from '../domain/engines/financialMath'
import { parseLocalDate } from '../utils/dates'
import { nominalMonthlyDate } from '../utils/peruBusinessCalendar'
import type { CreditInput } from '../domain/schedule/scheduleTypes'
import { REFERENCE_MONTHLY_CASES } from './fixtures/referenceSchedules'

type Field = 'principal' | 'interestCharges' | 'coverageFund' | 'total'

interface AccuracyMetrics {
  rowsExact: number
  rowsTotal: number
  datesExact: number
  cellsExact: number
  cellsTotal: number
  totalAbsoluteError: number
  maximumDifference: number
  principalTotalDifference: number
  interestTotalDifference: number
  coverageTotalDifference: number
  grandTotalDifference: number
}

const FIELDS: Field[] = ['principal', 'interestCharges', 'coverageFund', 'total']

// Línea base auditable de la fórmula general solicitada. No son tolerancias:
// cualquier cambio de una celda modifica estas métricas exactas y falla el test.
const EXPECTED_ACCURACY: Record<string, AccuracyMetrics> = {
  'monthly-educativo': {
    rowsExact: 2, rowsTotal: 12, datesExact: 12, cellsExact: 25, cellsTotal: 48,
    totalAbsoluteError: 1.24, maximumDifference: 0.25, principalTotalDifference: 0,
    interestTotalDifference: 0.25, coverageTotalDifference: 0, grandTotalDifference: 0.25,
  },
  'monthly-campana': {
    rowsExact: 0, rowsTotal: 1, datesExact: 1, cellsExact: 2, cellsTotal: 4,
    totalAbsoluteError: 0.02, maximumDifference: 0.01, principalTotalDifference: 0,
    interestTotalDifference: 0.01, coverageTotalDifference: 0, grandTotalDifference: 0.01,
  },
  'monthly-adrawash': {
    rowsExact: 3, rowsTotal: 18, datesExact: 18, cellsExact: 37, cellsTotal: 72,
    totalAbsoluteError: 1.1, maximumDifference: 0.14, principalTotalDifference: 0,
    interestTotalDifference: 0.13, coverageTotalDifference: 0, grandTotalDifference: 0.13,
  },
  'monthly-mejorando-mi-hogar': {
    rowsExact: 1, rowsTotal: 12, datesExact: 12, cellsExact: 21, cellsTotal: 48,
    totalAbsoluteError: 1.3, maximumDifference: 0.3, principalTotalDifference: 0,
    interestTotalDifference: 0.3, coverageTotalDifference: 0, grandTotalDifference: 0.3,
  },
  'monthly-mejorando-mi-hogar-18000': {
    rowsExact: 0, rowsTotal: 24, datesExact: 23, cellsExact: 42, cellsTotal: 96,
    totalAbsoluteError: 127.94, maximumDifference: 20.94, principalTotalDifference: 0,
    interestTotalDifference: -2.34, coverageTotalDifference: -0.02, grandTotalDifference: -2.36,
  },
  'monthly-complementario': {
    rowsExact: 1, rowsTotal: 8, datesExact: 8, cellsExact: 16, cellsTotal: 32,
    totalAbsoluteError: 0.48, maximumDifference: 0.07, principalTotalDifference: 0,
    interestTotalDifference: 0.06, coverageTotalDifference: 0, grandTotalDifference: 0.06,
  },
}

function inputFor(referenceCase: (typeof REFERENCE_MONTHLY_CASES)[number]): CreditInput {
  return { ...referenceCase.input }
}

function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function accuracyFor(referenceCase: (typeof REFERENCE_MONTHLY_CASES)[number]): AccuracyMetrics {
  const actual = calculateMonthlySchedule(inputFor(referenceCase))
  const differences = referenceCase.rows.flatMap((row, index) => (
    FIELDS.map((field) => actual.rows[index][field] - row[field])
  ))

  return {
    rowsExact: referenceCase.rows.filter((row, index) => {
      const actualRow = actual.rows[index]
      return isoDate(actualRow.dueDate) === row.dueDate
        && FIELDS.every((field) => actualRow[field] === row[field])
    }).length,
    rowsTotal: referenceCase.rows.length,
    datesExact: referenceCase.rows.filter((row, index) => isoDate(actual.rows[index].dueDate) === row.dueDate).length,
    cellsExact: differences.filter((difference) => difference === 0).length,
    cellsTotal: differences.length,
    totalAbsoluteError: round2(differences.reduce((sum, difference) => sum + Math.abs(difference), 0)),
    maximumDifference: round2(Math.max(...differences.map(Math.abs))),
    principalTotalDifference: round2(actual.totals.principal - referenceCase.totals.principal),
    interestTotalDifference: round2(actual.totals.interestCharges - referenceCase.totals.interestCharges),
    coverageTotalDifference: round2(actual.totals.coverageFund - referenceCase.totals.coverageFund),
    grandTotalDifference: round2(actual.totals.total - referenceCase.totals.total),
  }
}

describe.each(REFERENCE_MONTHLY_CASES)('calculateMonthlySchedule - $id', (referenceCase) => {
  const result = calculateMonthlySchedule(inputFor(referenceCase))

  it('genera el número de cuotas esperado y capitaliza exactamente el monto', () => {
    expect(result.rows).toHaveLength(referenceCase.rows.length)
    expect(result.totals.principal).toBe(referenceCase.input.amount)
  })

  it('reporta métricas exactas de filas, celdas, errores y totales', () => {
    expect(accuracyFor(referenceCase)).toEqual(EXPECTED_ACCURACY[referenceCase.id])
  })

  it('mantiene fechas nominales, efectivas y de devengo como conceptos separados', () => {
    for (const row of result.rows) {
      expect(row.dueDate).toBe(row.effectiveDueDate)
      expect(row.accrualDate).toBe(row.effectiveDueDate)
      expect(Number.isInteger(row.accrualDays)).toBe(true)
      expect(row.accrualDays).toBeGreaterThan(0)
    }
  })

  it('no genera valores NaN ni Infinity', () => {
    for (const row of result.rows) {
      for (const field of FIELDS) {
        expect(Number.isFinite(row[field])).toBe(true)
      }
    }
  })
})

describe('caso Hogar S/18,000', () => {
  const reference = REFERENCE_MONTHLY_CASES.find((item) => item.id === 'monthly-mejorando-mi-hogar-18000')!
  const result = calculateMonthlySchedule(inputFor(reference))

  it('resuelve la cuota programada en S/1192', () => {
    expect(result.scheduledPayment).toBe(1192)
  })

  it('aplica dos periodos de cobertura en la primera cuota y muestra S/33.51', () => {
    const disbursement = parseLocalDate(reference.input.disbursementDate)
    const firstDue = parseLocalDate(reference.input.firstDueDate)
    const nominalDates = Array.from({ length: reference.input.installments }, (_, index) => (
      nominalMonthlyDate(firstDue, reference.input.nominalPaymentDay, index + 1)
    ))
    expect(getCoverageMonths(disbursement, nominalDates, 0)).toBe(2)
    expect(result.rows[0].coverageFund).toBe(33.51)
  })

  it('usa días efectivos sin inventar correcciones de devengo', () => {
    expect(result.rows[0].accrualDays).toBe(39)
    expect(result.rows[0].interestCharges).toBe(894.22)
    expect(result.rows[0].principal).toBe(264.27)
    expect(result.rows[0].total).toBe(1192)
  })
})
