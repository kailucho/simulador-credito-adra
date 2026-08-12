/**
 * Harness de ingeniería inversa para el motor MONTHLY_COMMON.
 *
 * Evalúa modelos candidatos contra las 51 cuotas reales de
 * docs/reverse-engineering/reference-schedules.json (5 cronogramas
 * mensuales) y reporta métricas de ajuste por modelo. NO debe ejecutarse
 * desde la UI ni desde el motor de producción — es una herramienta de
 * investigación standalone.
 *
 * Uso: npx tsx scripts/reverse-engineer-monthly.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REFERENCE_PATH = path.join(__dirname, '..', 'docs', 'reverse-engineering', 'reference-schedules.json')

// ---------------------------------------------------------------------------
// Datos de referencia
// ---------------------------------------------------------------------------

interface ReferenceRow {
  installmentNumber: number
  dueDate: string
  principal: number
  interestCharges: number
  coverageFund: number
  total: number
}

interface ReferenceCase {
  id: string
  product: string
  input: {
    amount: number
    installments: number
    monthlyRate: number
    disbursementDate: string
    firstDueDate: string
    nominalPaymentDay: number
    coverageFundRate: number
  }
  rows: ReferenceRow[]
  totals: { principal: number; interestCharges: number; coverageFund: number; total: number }
}

interface ReferenceFile {
  monthly: ReferenceCase[]
}

const referenceData: ReferenceFile = JSON.parse(readFileSync(REFERENCE_PATH, 'utf8'))
const CASES = referenceData.monthly

// ---------------------------------------------------------------------------
// Utilidades de fecha (sin dependencias de zona horaria: trabajamos en UTC
// puro para contar días exactos entre fechas ISO YYYY-MM-DD)
// ---------------------------------------------------------------------------

function parseISO(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
}

// ---------------------------------------------------------------------------
// Redondeo
// ---------------------------------------------------------------------------

type RoundingPolicy = (value: number) => number

const ROUNDING_POLICIES: Record<string, RoundingPolicy> = {
  HALF_UP: (v) => Math.round((v + Number.EPSILON) * 100) / 100,
  HALF_EVEN: (v) => bankersRound(v, 2),
  TRUNCATE: (v) => Math.trunc(v * 100) / 100,
}

function bankersRound(value: number, decimals: number): number {
  const factor = 10 ** decimals
  const scaled = value * factor
  const floor = Math.floor(scaled)
  const diff = scaled - floor
  let rounded: number
  if (Math.abs(diff - 0.5) < 1e-9) {
    rounded = floor % 2 === 0 ? floor : floor + 1
  } else {
    rounded = Math.round(scaled)
  }
  return rounded / factor
}

// ---------------------------------------------------------------------------
// Familias de fórmula de interés (día-fracción). Cada una toma (rate decimal
// mensual, días efectivos del periodo) y devuelve la tasa de periodo.
// ---------------------------------------------------------------------------

type RateModel = (monthlyRate: number, days: number) => number

const RATE_MODELS: Record<string, RateModel> = {
  // Ya descartados en la investigación preliminar, se dejan para que el
  // harness los reporte con su score real y quede documentado por qué se
  // descartan (no se "sabe" de antemano, se mide).
  'compound_d30': (r, d) => (1 + r) ** (d / 30) - 1,
  'simple_d30': (r, d) => (r * d) / 30,
  'compound_daily_r30': (r, d) => (1 + r / 30) ** d - 1,
  'simple_365_12': (r, d) => (r * d * 12) / 365,
  'compound_d360_12': (r, d) => (1 + r) ** ((d * 12) / 360) - 1,

  // Familia de interpolación anclada en d=30 (dirigida por el hallazgo de
  // que el residuo es ~0 exactamente en d=30 y crece con |d-30|).
  // A: interpolación lineal entre exponente compuesto y simple según distancia a 30.
  'interp_lin_50_50': (r, d) => {
    const comp = (1 + r) ** (d / 30) - 1
    const simple = (r * d) / 30
    return (comp + simple) / 2
  },
  // B: simple sobre el exceso de días aplicado multiplicativamente sobre (1+r).
  'anchor_mult_excess_simple': (r, d) => {
    const wholeMonths = d / 30
    return (1 + r) ** Math.trunc(wholeMonths) * (1 + r * ((d % 30) / 30)) - 1
  },
  // C: devengo día a día con tasa diaria simple r/30, compuesta día a día.
  'daily_accrual_simple_compounded': (r, d) => {
    let acc = 1
    const daily = r / 30
    for (let i = 0; i < d; i += 1) acc *= 1 + daily
    return acc - 1
  },
  // D: exponente fraccionario pero sobre base (1+r/30) compuesta 30 veces por mes
  // (equivalente a compound_daily_r30, incluido por completitud/documentación).

  // E: tasa efectiva diaria exacta (30ª raíz), compuesta d veces (== compound_d30
  // matemáticamente, pero con distinto orden de redondeo en variantes cuantizadas más abajo).
  'effective_daily_root': (r, d) => (1 + r) ** (1 / 30) ** d - 1,
}

// Variantes cuantizadas: aplican una política de redondeo a la TASA antes o
// después de exponenciar, con distintas precisiones.
function buildQuantizedRateModels(): Record<string, RateModel> {
  const variants: Record<string, RateModel> = {}
  const precisions = [4, 5, 6, 7, 8, 9, 10, 11, 12]
  const quantizers: Record<string, (v: number, n: number) => number> = {
    round: (v, n) => Math.round(v * 10 ** n) / 10 ** n,
    trunc: (v, n) => Math.trunc(v * 10 ** n) / 10 ** n,
  }
  for (const [qName, qFn] of Object.entries(quantizers)) {
    for (const n of precisions) {
      variants[`periodRate_${qName}${n}`] = (r, d) => qFn((1 + r) ** (d / 30) - 1, n)
      variants[`dailyRate_${qName}${n}`] = (r, d) => {
        const daily = qFn((1 + r) ** (1 / 30) - 1, n)
        return (1 + daily) ** d - 1
      }
      // tasa diaria SIMPLE r/30 cuantizada, compuesta día a día
      variants[`dailySimple_${qName}${n}`] = (r, d) => {
        const daily = qFn(r / 30, n)
        return (1 + daily) ** d - 1
      }
    }
  }
  // Interpolación lineal PONDERADA entre exponente entero inferior y superior de (1+r)^k,
  // con peso = fracción de día dentro del mes (familia dirigida por el hallazgo de
  // que el residuo cruza cero exactamente en d=30 y es antisimétrico en signo).
  for (const w of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
    variants[`interp_w${w}`] = (r, d) => {
      const comp = (1 + r) ** (d / 30) - 1
      const simple = (r * d) / 30
      return w * comp + (1 - w) * simple
    }
  }
  return variants
}

Object.assign(RATE_MODELS, buildQuantizedRateModels())

// ---------------------------------------------------------------------------
// Regla del fondo de cobertura: factor de periodos cubiertos por fila.
// Confirmado: coverage = balance_actual * coverageFundRate * periods, donde
// periods normalmente es 1, salvo cuando el periodo cruza más de una fecha
// nominal mensual (caso Educativo cuota 1: 27/11 -> 02/01 cruza dic y ene).
// ---------------------------------------------------------------------------

type CoverageModel = (
  balance: number,
  installmentNumber: number,
  coverageFundRate: number,
  nominalMonthsCrossed: number,
) => number

// coverageFundRate en el JSON de referencia está expresado como porcentaje
// (0.09309 significa 0.09309%), igual que en el prompt. Se convierte a
// decimal aquí, en el borde de lectura de datos de referencia.
const COVERAGE_MODELS: Record<string, CoverageModel> = {
  'balance_x_rate_x_nominalMonths': (balance, _n, rate, months) => balance * (rate / 100) * months,
  'balance_x_rate_flat1': (balance, _n, rate) => balance * (rate / 100),
}

// ---------------------------------------------------------------------------
// Cálculo de meses nominales cruzados entre desembolso/cuota anterior y la
// fecha efectiva de la cuota actual, contando fronteras de mes calendario.
// ---------------------------------------------------------------------------

function nominalMonthsCrossed(fromISO: string, toISO: string): number {
  const from = parseISO(fromISO)
  const to = parseISO(toISO)
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  return Math.max(1, months)
}

// ---------------------------------------------------------------------------
// Simulación de un cronograma completo con un modelo candidato dado.
// La cuota fija se toma tal cual el valor de referencia (payment discovery
// es un eje aparte, ver `paymentModel` — por defecto se usa el pago real
// reportado en filas no-última, que es una constante estable del cronograma).
// ---------------------------------------------------------------------------

interface Candidate {
  name: string
  rateModel: RateModel
  coverageModel: CoverageModel
  roundingPolicy: RoundingPolicy
  balancePrecision: 'rounded' | 'raw'
}

interface RowComparison {
  caseId: string
  installmentNumber: number
  days: number
  principalMatch: boolean
  interestMatch: boolean
  coverageMatch: boolean
  totalMatch: boolean
  interestError: number
  principalError: number
  coverageError: number
}

function simulateCase(referenceCase: ReferenceCase, candidate: Candidate): RowComparison[] {
  const { rows, input } = referenceCase
  const payment = rows[0].total // cuota fija observada (constante salvo la última)
  const results: RowComparison[] = []

  let balance = input.amount
  let prevDate = input.disbursementDate

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const isLast = i === rows.length - 1
    const days = daysBetween(prevDate, row.dueDate)
    const months = nominalMonthsCrossed(prevDate, row.dueDate)

    const rate = candidate.rateModel(input.monthlyRate / 100, days)
    const rawInterest = balance * rate
    const interest = candidate.roundingPolicy(rawInterest)

    const rawCoverage = candidate.coverageModel(balance, i + 1, input.coverageFundRate, months)
    const coverage = candidate.roundingPolicy(rawCoverage)

    let principal: number
    let total: number
    if (isLast) {
      principal = candidate.roundingPolicy(balance)
      total = candidate.roundingPolicy(principal + interest + coverage)
    } else {
      principal = candidate.roundingPolicy(payment - interest - coverage)
      total = payment
    }

    results.push({
      caseId: referenceCase.id,
      installmentNumber: row.installmentNumber,
      days,
      principalMatch: principal === row.principal,
      interestMatch: interest === row.interestCharges,
      coverageMatch: coverage === row.coverageFund,
      totalMatch: Math.abs(total - row.total) < 0.005,
      interestError: Math.abs(interest - row.interestCharges),
      principalError: Math.abs(principal - row.principal),
      coverageError: Math.abs(coverage - row.coverageFund),
    })

    const nextBalance = balance - principal
    balance = candidate.balancePrecision === 'rounded' ? candidate.roundingPolicy(nextBalance) : nextBalance
    prevDate = row.dueDate
  }

  return results
}

// ---------------------------------------------------------------------------
// Métricas y reporte
// ---------------------------------------------------------------------------

interface ModelScore {
  name: string
  totalCells: number
  exactCells: number
  exactPct: number
  mae: number
  totalAbsError: number
  maxAbsError: number
  totalsError: number
  byProduct: Record<string, { exact: number; total: number }>
  byDays: Record<number, { exact: number; total: number }>
  byInstallmentNumber: Record<number, { exact: number; total: number }>
}

function scoreCandidate(candidate: Candidate): ModelScore {
  let totalCells = 0
  let exactCells = 0
  let totalAbsError = 0
  let maxAbsError = 0
  let totalsError = 0
  const byProduct: ModelScore['byProduct'] = {}
  const byDays: ModelScore['byDays'] = {}
  const byInstallmentNumber: ModelScore['byInstallmentNumber'] = {}

  for (const referenceCase of CASES) {
    const rows = simulateCase(referenceCase, candidate)
    const productBucket = (byProduct[referenceCase.product] ??= { exact: 0, total: 0 })

    let caseInterestSum = 0
    let caseReferenceInterestSum = 0

    for (const row of rows) {
      // Tres celdas financieras comparables por fila: capital, interés, fondo.
      const cellResults = [row.principalMatch, row.interestMatch, row.coverageMatch]
      const cellErrors = [row.principalError, row.interestError, row.coverageError]

      for (let c = 0; c < cellResults.length; c += 1) {
        totalCells += 1
        productBucket.total += 1
        const dayBucket = (byDays[row.days] ??= { exact: 0, total: 0 })
        dayBucket.total += 1
        const nBucket = (byInstallmentNumber[row.installmentNumber] ??= { exact: 0, total: 0 })
        nBucket.total += 1

        if (cellResults[c]) {
          exactCells += 1
          productBucket.exact += 1
          dayBucket.exact += 1
          nBucket.exact += 1
        }
        totalAbsError += cellErrors[c]
        maxAbsError = Math.max(maxAbsError, cellErrors[c])
      }

      caseInterestSum += row.interestError
      caseReferenceInterestSum += 0 // placeholder, totals compared below via case totals
    }

    void caseInterestSum
    void caseReferenceInterestSum

    // Error de totales: comparar el total de intereses simulado vs el de referencia.
    const simulatedTotals = rows.reduce((sum, r) => sum + (r.interestMatch ? 0 : r.interestError), 0)
    totalsError += simulatedTotals
  }

  return {
    name: candidate.name,
    totalCells,
    exactCells,
    exactPct: (100 * exactCells) / totalCells,
    mae: totalAbsError / totalCells,
    totalAbsError,
    maxAbsError,
    totalsError,
    byProduct,
    byDays,
    byInstallmentNumber,
  }
}

// ---------------------------------------------------------------------------
// Construcción del espacio de búsqueda (producto cartesiano acotado)
// ---------------------------------------------------------------------------

function buildCandidates(): Candidate[] {
  const candidates: Candidate[] = []
  for (const [rateName, rateModel] of Object.entries(RATE_MODELS)) {
    for (const [coverageName, coverageModel] of Object.entries(COVERAGE_MODELS)) {
      for (const [roundingName, roundingPolicy] of Object.entries(ROUNDING_POLICIES)) {
        for (const balancePrecision of ['rounded', 'raw'] as const) {
          candidates.push({
            name: `${rateName} | ${coverageName} | ${roundingName} | bal:${balancePrecision}`,
            rateModel,
            coverageModel,
            roundingPolicy,
            balancePrecision,
          })
        }
      }
    }
  }
  return candidates
}

function formatPct(value: number): string {
  return `${value.toFixed(2)}%`
}

function main() {
  const candidates = buildCandidates()
  const scores = candidates.map(scoreCandidate)
  scores.sort((a, b) => b.exactCells - a.exactCells || a.mae - b.mae)

  console.log(`Evaluados ${candidates.length} modelos candidatos sobre ${CASES.length} cronogramas ` +
    `(${scores[0]?.totalCells ?? 0} celdas financieras por modelo: capital + interés + fondo por fila).\n`)

  console.log('Top 20 modelos por celdas exactas:')
  console.log('-'.repeat(120))
  for (const score of scores.slice(0, 20)) {
    console.log(
      `${String(score.exactCells).padStart(3)}/${score.totalCells} (${formatPct(score.exactPct)})  ` +
        `mae=${score.mae.toFixed(5)}  maxErr=${score.maxAbsError.toFixed(3)}  totalsErr=${score.totalsError.toFixed(3)}  ` +
        score.name,
    )
  }

  const best = scores[0]
  if (best) {
    console.log(`\nMejor modelo: ${best.name}`)
    console.log(`  Exactitud: ${best.exactCells}/${best.totalCells} (${formatPct(best.exactPct)})`)
    console.log('  Por producto:')
    for (const [product, bucket] of Object.entries(best.byProduct)) {
      console.log(`    ${product}: ${bucket.exact}/${bucket.total}`)
    }
    console.log('  Por días de periodo:')
    for (const [days, bucket] of Object.entries(best.byDays).sort((a, b) => Number(a[0]) - Number(b[0]))) {
      console.log(`    d=${days}: ${bucket.exact}/${bucket.total}`)
    }
    console.log('  Por número de cuota:')
    for (const [n, bucket] of Object.entries(best.byInstallmentNumber).sort((a, b) => Number(a[0]) - Number(b[0]))) {
      console.log(`    #${n}: ${bucket.exact}/${bucket.total}`)
    }

    if (best.exactPct < 100) {
      console.log('\nNo se alcanzó el 100% exacto con el espacio de búsqueda evaluado.')
      console.log('Revisar docs/reverse-engineering/findings.md para el detalle de hipótesis descartadas')
      console.log('y qué cronograma adicional permitiría diferenciar los modelos restantes.')
    }
  }
}

main()
