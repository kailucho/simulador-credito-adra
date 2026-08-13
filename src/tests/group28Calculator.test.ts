import { describe, expect, it } from 'vitest'
import { calculateGroup28Schedule, group28EffectiveDayBase } from '../domain/engines/group28Calculator'
import { round2 } from '../domain/engines/financialMath'
import type { CreditInput } from '../domain/schedule/scheduleTypes'
import { REFERENCE_GROUP28_CASES } from './fixtures/referenceSchedules'

describe('round2', () => {
  it('rounds to 2 decimals using standard rounding', () => {
    expect(round2(1.005)).toBeCloseTo(1.01, 2)
    expect(round2(12.5249999)).toBe(12.52)
    expect(round2(0)).toBe(0)
  })
})

describe('group28EffectiveDayBase', () => {
  it('calcula la base efectiva estimada para una tasa mensual de 4.70%', () => {
    expect(group28EffectiveDayBase(4.7)).toBeCloseTo(30.9704571112, 10)
  })
})

describe.each(REFERENCE_GROUP28_CASES)('calculateGroup28Schedule - $id', (referenceCase) => {
  const input: CreditInput = referenceCase.input
  const result = calculateGroup28Schedule(input)

  it.each(referenceCase.rows.map((row, index) => ({ row, index })))(
    'cuota $row.installmentNumber coincide al céntimo',
    ({ row, index }) => {
      const actual = result.rows[index]
      expect(actual.principal).toBe(row.principal)
      expect(actual.interestCharges).toBe(row.interestCharges)
      expect(actual.installmentTotal).toBe(row.installmentTotal)
      expect(actual.contribution).toBe(row.contribution)
      expect(actual.total).toBe(row.total)
    },
  )

  it('totales coinciden al céntimo', () => {
    expect(result.totals.principal).toBe(referenceCase.totals.principal)
    expect(result.totals.interestCharges).toBe(referenceCase.totals.interestCharges)
    expect(result.totals.installmentTotal).toBe(referenceCase.totals.installmentTotal)
    expect(result.totals.contribution).toBe(referenceCase.totals.contribution)
    expect(result.totals.total).toBe(referenceCase.totals.total)
  })
})

describe('reglas generales', () => {
  function baseInput(overrides: Partial<CreditInput>): CreditInput {
    return {
      amount: 500,
      installments: 4,
      monthlyRate: 5,
      disbursementDate: '2026-07-30',
      firstDueDate: '2026-08-25',
      ...overrides,
    }
  }

  const cases = [
    baseInput({ amount: 300 }),
    baseInput({ amount: 500 }),
    baseInput({ amount: 3000 }),
    baseInput({ amount: 750, installments: 8, monthlyRate: 3.5 }),
  ]

  it('las fechas de vencimiento están separadas exactamente por 28 días', () => {
    for (const input of cases) {
      const { rows } = calculateGroup28Schedule(input)
      for (let i = 1; i < rows.length; i += 1) {
        const diffMs = rows[i].dueDate.getTime() - rows[i - 1].dueDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        expect(diffDays).toBe(28)
      }
    }
  })

  it('la primera fecha de vencimiento coincide con la ingresada por el usuario', () => {
    const input = baseInput({ firstDueDate: '2026-08-25' })
    const { rows } = calculateGroup28Schedule(input)
    expect(rows[0].dueDate.getFullYear()).toBe(2026)
    expect(rows[0].dueDate.getMonth()).toBe(7) // agosto (0-indexed)
    expect(rows[0].dueDate.getDate()).toBe(25)
  })

  it('el saldo llega exactamente a cero (la última cuota cancela todo)', () => {
    for (const input of cases) {
      const { rows, totals } = calculateGroup28Schedule(input)
      const totalPaidPrincipal = rows.reduce((sum, row) => sum + row.principal, 0)
      expect(round2(totalPaidPrincipal)).toBe(round2(input.amount))
      expect(totals.principal).toBe(round2(input.amount))
    }
  })

  it('el aporte total equivale al 10% del monto', () => {
    for (const input of cases) {
      const { totals } = calculateGroup28Schedule(input)
      expect(totals.contribution).toBe(round2(input.amount * 0.1))
    }
  })

  it('el microseguro equivale a cuotas x S/1.20', () => {
    for (const input of cases) {
      const { lifeInsurance } = calculateGroup28Schedule(input)
      expect(lifeInsurance).toBe(round2(input.installments * 1.2))
    }
  })

  it('no genera valores NaN ni Infinity en ninguna fila', () => {
    for (const input of cases) {
      const { rows, totals } = calculateGroup28Schedule(input)
      for (const row of rows) {
        expect(Number.isFinite(row.principal)).toBe(true)
        expect(Number.isFinite(row.interestCharges)).toBe(true)
        expect(Number.isFinite(row.installmentTotal)).toBe(true)
        expect(Number.isFinite(row.contribution)).toBe(true)
        expect(Number.isFinite(row.total)).toBe(true)
      }
      expect(Number.isFinite(totals.principal)).toBe(true)
      expect(Number.isFinite(totals.interestCharges)).toBe(true)
      expect(Number.isFinite(totals.total)).toBe(true)
    }
  })

  it('el capital total coincide con el monto prestado', () => {
    for (const input of cases) {
      const { totals } = calculateGroup28Schedule(input)
      expect(totals.principal).toBe(round2(input.amount))
    }
  })
})
