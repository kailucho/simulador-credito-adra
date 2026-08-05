import { describe, expect, it } from 'vitest'
import { calculateSchedule, round2 } from '../domain/creditCalculator'
import type { CreditInput } from '../domain/creditTypes'

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

describe('round2', () => {
  it('rounds to 2 decimals using standard rounding', () => {
    expect(round2(1.005)).toBeCloseTo(1.01, 2)
    expect(round2(12.5249999)).toBe(12.52)
    expect(round2(0)).toBe(0)
  })
})

describe('calculateSchedule - CASO 1 (monto 300)', () => {
  const result = calculateSchedule(baseInput({ amount: 300, firstDueDate: '2026-08-25' }))

  it('cuota 1', () => {
    expect(result.rows[0].principal).toBe(71.48)
    expect(result.rows[0].interestCharges).toBe(12.52)
    expect(result.rows[0].installmentTotal).toBe(84.0)
    expect(result.rows[0].contribution).toBe(8.0)
    expect(result.rows[0].total).toBe(92.0)
  })

  it('cuota 2', () => {
    expect(result.rows[1].principal).toBe(73.71)
    expect(result.rows[1].interestCharges).toBe(10.29)
    expect(result.rows[1].installmentTotal).toBe(84.0)
    expect(result.rows[1].contribution).toBe(8.0)
    expect(result.rows[1].total).toBe(92.0)
  })

  it('cuota 3', () => {
    expect(result.rows[2].principal).toBe(77.03)
    expect(result.rows[2].interestCharges).toBe(6.97)
    expect(result.rows[2].installmentTotal).toBe(84.0)
    expect(result.rows[2].contribution).toBe(8.0)
    expect(result.rows[2].total).toBe(92.0)
  })

  it('cuota 4 (última)', () => {
    expect(result.rows[3].principal).toBe(77.78)
    expect(result.rows[3].interestCharges).toBe(3.5)
    expect(result.rows[3].installmentTotal).toBe(81.28)
    expect(result.rows[3].contribution).toBe(6.0)
    expect(result.rows[3].total).toBe(87.28)
  })

  it('totales', () => {
    expect(result.totals.principal).toBe(300.0)
    expect(result.totals.interestCharges).toBe(33.28)
    expect(result.totals.installmentTotal).toBe(333.28)
    expect(result.totals.contribution).toBe(30.0)
    expect(result.totals.total).toBe(363.28)
  })
})

describe('calculateSchedule - CASO 2 (monto 500)', () => {
  const result = calculateSchedule(baseInput({ amount: 500 }))

  it('cuota 1', () => {
    expect(result.rows[0].principal).toBe(118.13)
    expect(result.rows[0].interestCharges).toBe(20.87)
    expect(result.rows[0].installmentTotal).toBe(139.0)
    expect(result.rows[0].contribution).toBe(13.0)
    expect(result.rows[0].total).toBe(152.0)
  })

  it('cuota 2', () => {
    expect(result.rows[1].principal).toBe(121.81)
    expect(result.rows[1].interestCharges).toBe(17.19)
    expect(result.rows[1].installmentTotal).toBe(139.0)
    expect(result.rows[1].contribution).toBe(13.0)
    expect(result.rows[1].total).toBe(152.0)
  })

  it('cuota 3', () => {
    expect(result.rows[2].principal).toBe(127.29)
    expect(result.rows[2].interestCharges).toBe(11.71)
    expect(result.rows[2].installmentTotal).toBe(139.0)
    expect(result.rows[2].contribution).toBe(13.0)
    expect(result.rows[2].total).toBe(152.0)
  })

  it('cuota 4 (última)', () => {
    expect(result.rows[3].principal).toBe(132.77)
    expect(result.rows[3].interestCharges).toBe(5.98)
    expect(result.rows[3].installmentTotal).toBe(138.75)
    expect(result.rows[3].contribution).toBe(11.0)
    expect(result.rows[3].total).toBe(149.75)
  })

  it('totales', () => {
    expect(result.totals.principal).toBe(500.0)
    expect(result.totals.interestCharges).toBe(55.75)
    expect(result.totals.installmentTotal).toBe(555.75)
    expect(result.totals.contribution).toBe(50.0)
    expect(result.totals.total).toBe(605.75)
  })
})

describe('calculateSchedule - CASO 3 (monto 3000)', () => {
  const result = calculateSchedule(baseInput({ amount: 3000 }))

  it('cuota 1', () => {
    expect(result.rows[0].principal).toBe(708.78)
    expect(result.rows[0].interestCharges).toBe(125.22)
    expect(result.rows[0].installmentTotal).toBe(834.0)
    expect(result.rows[0].contribution).toBe(75.0)
    expect(result.rows[0].total).toBe(909.0)
  })

  it('cuota 2', () => {
    expect(result.rows[1].principal).toBe(730.84)
    expect(result.rows[1].interestCharges).toBe(103.16)
    expect(result.rows[1].installmentTotal).toBe(834.0)
    expect(result.rows[1].contribution).toBe(75.0)
    expect(result.rows[1].total).toBe(909.0)
  })

  it('cuota 3', () => {
    expect(result.rows[2].principal).toBe(763.75)
    expect(result.rows[2].interestCharges).toBe(70.25)
    expect(result.rows[2].installmentTotal).toBe(834.0)
    expect(result.rows[2].contribution).toBe(75.0)
    expect(result.rows[2].total).toBe(909.0)
  })

  it('cuota 4 (última)', () => {
    expect(result.rows[3].principal).toBe(796.63)
    expect(result.rows[3].interestCharges).toBe(35.87)
    expect(result.rows[3].installmentTotal).toBe(832.5)
    expect(result.rows[3].contribution).toBe(75.0)
    expect(result.rows[3].total).toBe(907.5)
  })

  it('totales', () => {
    expect(result.totals.principal).toBe(3000.0)
    expect(result.totals.interestCharges).toBe(334.5)
    expect(result.totals.installmentTotal).toBe(3334.5)
    expect(result.totals.contribution).toBe(300.0)
    expect(result.totals.total).toBe(3634.5)
  })
})

describe('reglas generales', () => {
  const cases = [
    baseInput({ amount: 300 }),
    baseInput({ amount: 500 }),
    baseInput({ amount: 3000 }),
    baseInput({ amount: 750, installments: 8, monthlyRate: 3.5 }),
  ]

  it('las fechas de vencimiento están separadas exactamente por 28 días', () => {
    for (const input of cases) {
      const { rows } = calculateSchedule(input)
      for (let i = 1; i < rows.length; i += 1) {
        const diffMs = rows[i].dueDate.getTime() - rows[i - 1].dueDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        expect(diffDays).toBe(28)
      }
    }
  })

  it('la primera fecha de vencimiento coincide con la ingresada por el usuario', () => {
    const input = baseInput({ firstDueDate: '2026-08-25' })
    const { rows } = calculateSchedule(input)
    expect(rows[0].dueDate.getFullYear()).toBe(2026)
    expect(rows[0].dueDate.getMonth()).toBe(7) // agosto (0-indexed)
    expect(rows[0].dueDate.getDate()).toBe(25)
  })

  it('el saldo llega exactamente a cero (la última cuota cancela todo)', () => {
    for (const input of cases) {
      const { rows, totals } = calculateSchedule(input)
      const totalPaidPrincipal = rows.reduce((sum, row) => sum + row.principal, 0)
      expect(round2(totalPaidPrincipal)).toBe(round2(input.amount))
      expect(totals.principal).toBe(round2(input.amount))
    }
  })

  it('el aporte total equivale al 10% del monto', () => {
    for (const input of cases) {
      const { totals } = calculateSchedule(input)
      expect(totals.contribution).toBe(round2(input.amount * 0.1))
    }
  })

  it('el microseguro equivale a cuotas x S/1.20', () => {
    for (const input of cases) {
      const { lifeInsurance } = calculateSchedule(input)
      expect(lifeInsurance).toBe(round2(input.installments * 1.2))
    }
  })

  it('no genera valores NaN ni Infinity en ninguna fila', () => {
    for (const input of cases) {
      const { rows, totals } = calculateSchedule(input)
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
      const { totals } = calculateSchedule(input)
      expect(totals.principal).toBe(round2(input.amount))
    }
  })
})
