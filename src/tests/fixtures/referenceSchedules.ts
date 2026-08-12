import referenceSchedulesJson from '../../../docs/reverse-engineering/reference-schedules.json'

export interface ReferenceGroup28Row {
  installmentNumber: number
  principal: number
  interestCharges: number
  installmentTotal: number
  contribution: number
  total: number
}

export interface ReferenceGroup28Case {
  id: string
  product: string
  input: {
    amount: number
    installments: number
    monthlyRate: number
    disbursementDate: string
    firstDueDate: string
  }
  rows: ReferenceGroup28Row[]
  totals: {
    principal: number
    interestCharges: number
    installmentTotal: number
    contribution: number
    total: number
  }
}

export interface ReferenceMonthlyRow {
  installmentNumber: number
  dueDate: string
  principal: number
  interestCharges: number
  coverageFund: number
  total: number
}

export interface ReferenceMonthlyCase {
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
  rows: ReferenceMonthlyRow[]
  totals: {
    principal: number
    interestCharges: number
    coverageFund: number
    total: number
  }
}

interface ReferenceSchedulesFile {
  group28: ReferenceGroup28Case[]
  monthly: ReferenceMonthlyCase[]
}

const data = referenceSchedulesJson as unknown as ReferenceSchedulesFile

export const REFERENCE_GROUP28_CASES: ReferenceGroup28Case[] = data.group28
export const REFERENCE_MONTHLY_CASES: ReferenceMonthlyCase[] = data.monthly
