import { calculateGroup28Schedule } from '../src/domain/engines/group28Calculator'
import { calculateMonthlySchedule } from '../src/domain/engines/monthlyCalculator'
import { round2 } from '../src/domain/engines/financialMath'
import { REFERENCE_GROUP28_CASES, REFERENCE_MONTHLY_CASES } from '../src/tests/fixtures/referenceSchedules'

type FinancialField = 'principal' | 'interestCharges' | 'coverageFund' | 'total'

const monthlyFields: FinancialField[] = ['principal', 'interestCharges', 'coverageFund', 'total']

function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const group28 = REFERENCE_GROUP28_CASES.map((reference) => {
  const actual = calculateGroup28Schedule(reference.input)
  const differences = reference.rows.flatMap((row, index) => {
    const actualRow = actual.rows[index]
    return [
      actualRow.principal - row.principal,
      actualRow.interestCharges - row.interestCharges,
      actualRow.installmentTotal - row.installmentTotal,
      actualRow.contribution - row.contribution,
      actualRow.total - row.total,
    ]
  })

  return {
    id: reference.id,
    rowsExact: reference.rows.filter((row, index) => {
      const actualRow = actual.rows[index]
      return actualRow.principal === row.principal
        && actualRow.interestCharges === row.interestCharges
        && actualRow.installmentTotal === row.installmentTotal
        && actualRow.contribution === row.contribution
        && actualRow.total === row.total
    }).length,
    rowsTotal: reference.rows.length,
    cellsExact: differences.filter((difference) => difference === 0).length,
    cellsTotal: differences.length,
    totalAbsoluteError: round2(differences.reduce((sum, difference) => sum + Math.abs(difference), 0)),
    maximumDifference: round2(Math.max(...differences.map(Math.abs))),
    principalTotalDifference: round2(actual.totals.principal - reference.totals.principal),
    interestTotalDifference: round2(actual.totals.interestCharges - reference.totals.interestCharges),
    coverageOrContributionDifference: round2(actual.totals.contribution - reference.totals.contribution),
    grandTotalDifference: round2(actual.totals.total - reference.totals.total),
    scheduledPayment: actual.scheduledPayment,
  }
})

const monthly = REFERENCE_MONTHLY_CASES.map((reference) => {
  const actual = calculateMonthlySchedule(reference.input)
  const differences = reference.rows.flatMap((row, index) => (
    monthlyFields.map((field) => actual.rows[index][field] - row[field])
  ))
  const datesExact = reference.rows.filter((row, index) => isoDate(actual.rows[index].dueDate) === row.dueDate).length

  return {
    id: reference.id,
    rowsExact: reference.rows.filter((row, index) => {
      const actualRow = actual.rows[index]
      return isoDate(actualRow.dueDate) === row.dueDate
        && monthlyFields.every((field) => actualRow[field] === row[field])
    }).length,
    rowsTotal: reference.rows.length,
    datesExact,
    cellsExact: differences.filter((difference) => difference === 0).length,
    cellsTotal: differences.length,
    totalAbsoluteError: round2(differences.reduce((sum, difference) => sum + Math.abs(difference), 0)),
    maximumDifference: round2(Math.max(...differences.map(Math.abs))),
    principalTotalDifference: round2(actual.totals.principal - reference.totals.principal),
    interestTotalDifference: round2(actual.totals.interestCharges - reference.totals.interestCharges),
    coverageOrContributionDifference: round2(actual.totals.coverageFund - reference.totals.coverageFund),
    grandTotalDifference: round2(actual.totals.total - reference.totals.total),
    scheduledPayment: round2(actual.scheduledPayment),
  }
})

console.log(JSON.stringify({ group28, monthly }, null, 2))
