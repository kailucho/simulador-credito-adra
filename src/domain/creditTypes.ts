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
}

export interface ScheduleRow {
  installmentNumber: number
  dueDate: Date
  dueDateLabel: string
  principal: number
  interestCharges: number
  installmentTotal: number
  contribution: number
  total: number
}

export interface ScheduleTotals {
  principal: number
  interestCharges: number
  installmentTotal: number
  contribution: number
  total: number
}

export interface ScheduleResult {
  rows: ScheduleRow[]
  totals: ScheduleTotals
  lifeInsurance: number
  scheduledPayment: number
}

export type ValidationErrors = Partial<Record<keyof CreditInput, string>>
