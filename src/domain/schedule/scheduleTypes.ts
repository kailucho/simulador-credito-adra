export interface OptionalCreditFields {
  operationNumber?: string
  creditNumber?: string
  memberName?: string
  documentId?: string
  serviceAdvisor?: string
  communalAssociation?: string
  associationCycle?: string
  memberCycle?: string
  contributionsBalance?: string
  associationBankAccount?: string
}

export interface CreditInput extends OptionalCreditFields {
  amount: number
  installments: number
  monthlyRate: number
  disbursementDate: string // YYYY-MM-DD
  firstDueDate: string // YYYY-MM-DD
  /** Día contractual/nominal de pago (solo productos MONTHLY_COMMON). */
  nominalPaymentDay?: number
}

/** Fila de un cronograma GROUP_28 (interés a rebatir + aporte programado + microseguro). */
export interface Group28ScheduleRow {
  installmentNumber: number
  dueDate: Date
  dueDateLabel: string
  principal: number
  interestCharges: number
  installmentTotal: number
  contribution: number
  total: number
}

export interface Group28ScheduleTotals {
  principal: number
  interestCharges: number
  installmentTotal: number
  contribution: number
  total: number
}

export interface Group28ScheduleResult {
  rows: Group28ScheduleRow[]
  totals: Group28ScheduleTotals
  lifeInsurance: number
  scheduledPayment: number
}

/** Fila de un cronograma MONTHLY_COMMON (interés a rebatir + fondo de cobertura). */
export interface MonthlyScheduleRow {
  installmentNumber: number
  /** Fecha contractual, antes de ajustes de calendario. */
  nominalDueDate: Date
  /** Fecha visible, ajustada al siguiente día hábil. */
  effectiveDueDate: Date
  /** Fecha usada para devengo; hoy coincide con effectiveDueDate. */
  accrualDate: Date
  /** Días reales de devengo; separado para admitir una fuente interna futura. */
  accrualDays: number
  /** Alias compatible con los componentes existentes: effectiveDueDate. */
  dueDate: Date
  dueDateLabel: string
  principal: number
  interestCharges: number
  coverageFund: number
  total: number
}

export interface MonthlyScheduleTotals {
  principal: number
  interestCharges: number
  coverageFund: number
  total: number
}

export interface MonthlyScheduleResult {
  rows: MonthlyScheduleRow[]
  totals: MonthlyScheduleTotals
  scheduledPayment: number
}

export type ValidationErrors = Partial<Record<keyof CreditInput, string>>
