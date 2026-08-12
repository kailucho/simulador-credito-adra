import { describe, expect, it } from 'vitest'
import { effectiveMonthlyDueDate, isNonBusinessDay, nominalMonthlyDate } from '../utils/peruBusinessCalendar'

function d(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

describe('peruBusinessCalendar', () => {
  it('identifica fines de semana como no hábiles', () => {
    expect(isNonBusinessDay(d('2026-08-08'))).toBe(true) // sábado
    expect(isNonBusinessDay(d('2026-08-09'))).toBe(true) // domingo
    expect(isNonBusinessDay(d('2026-08-10'))).toBe(false) // lunes
  })

  it('identifica Jueves y Viernes Santo 2026 como no hábiles', () => {
    expect(isNonBusinessDay(d('2026-04-02'))).toBe(true) // Jueves Santo
    expect(isNonBusinessDay(d('2026-04-03'))).toBe(true) // Viernes Santo
    expect(isNonBusinessDay(d('2026-04-01'))).toBe(false)
  })

  // Los 8 corrimientos explícitos requeridos por el mandato de producto.
  it.each([
    { nominal: '2026-04-02', expected: '2026-04-06', label: 'Educativo 02/04/2026 -> 06/04/2026 (Jueves Santo)' },
    { nominal: '2026-05-02', expected: '2026-05-04', label: 'Educativo 02/05/2026 -> 04/05/2026 (sábado)' },
    { nominal: '2026-08-02', expected: '2026-08-03', label: 'Educativo 02/08/2026 -> 03/08/2026 (domingo)' },
    { nominal: '2026-02-08', expected: '2026-02-09', label: 'Complementario 08/02/2026 -> 09/02/2026 (domingo)' },
    { nominal: '2026-03-08', expected: '2026-03-09', label: 'Complementario 08/03/2026 -> 09/03/2026 (domingo)' },
    { nominal: '2026-08-08', expected: '2026-08-10', label: 'Complementario 08/08/2026 -> 10/08/2026 (sábado)' },
    { nominal: '2026-10-10', expected: '2026-10-12', label: 'ADRAWASH 10/10/2026 -> 12/10/2026 (sábado)' },
    { nominal: '2026-01-10', expected: '2026-01-12', label: 'Hogar 10/01/2026 -> 12/01/2026 (sábado)' },
  ])('$label', ({ nominal, expected }) => {
    const shifted = d(nominal)
    while (isNonBusinessDay(shifted)) shifted.setDate(shifted.getDate() + 1)
    expect(formatISO(shifted)).toBe(expected)
  })

  it('nominalMonthlyDate avanza un mes calendario por cuota manteniendo el día contractual', () => {
    const firstDue = d('2026-01-02')
    expect(formatISO(nominalMonthlyDate(firstDue, 2, 1))).toBe('2026-01-02')
    expect(formatISO(nominalMonthlyDate(firstDue, 2, 2))).toBe('2026-02-02')
    expect(formatISO(nominalMonthlyDate(firstDue, 2, 13))).toBe('2027-01-02')
  })

  it('nominalMonthlyDate clampa al último día del mes cuando el día contractual no existe', () => {
    // día contractual 31 en un mes de 30 días -> clampa a 30
    const firstDue = d('2026-01-31')
    const april = nominalMonthlyDate(firstDue, 31, 4) // abril tiene 30 días
    expect(april.getMonth()).toBe(3)
    expect(april.getDate()).toBe(30)
  })

  it('la cuota siguiente vuelve al día nominal, no al día corrido por feriado', () => {
    // Educativo: cuota 1 nominal 02/01 (hábil) -> efectiva 02/01.
    // cuota 4 nominal 02/04 (Jueves Santo) -> efectiva 06/04.
    // cuota 5 nominal 02/05 (sábado) -> efectiva 04/05, NO arrastra el 06/04.
    const firstDue = d('2026-01-02')
    const row4Nominal = nominalMonthlyDate(firstDue, 2, 4)
    const row5Nominal = nominalMonthlyDate(firstDue, 2, 5)
    expect(formatISO(row4Nominal)).toBe('2026-04-02')
    expect(formatISO(row5Nominal)).toBe('2026-05-02')
    expect(formatISO(effectiveMonthlyDueDate(firstDue, 2, 4))).toBe('2026-04-06')
    expect(formatISO(effectiveMonthlyDueDate(firstDue, 2, 5))).toBe('2026-05-04')
  })
})
