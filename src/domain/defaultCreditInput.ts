import type { CreditInput } from './creditTypes'

export const DEFAULT_CREDIT_INPUT: CreditInput = {
  amount: 500,
  installments: 4,
  monthlyRate: 5,
  disbursementDate: '2026-07-30',
  firstDueDate: '2026-08-25',
  operationNumber: '',
  creditNumber: '',
  memberName: '',
  documentId: '',
  serviceAdvisor: '',
  communalAssociation: '',
  associationCycle: '',
  memberCycle: '',
  contributionsBalance: '',
  associationBankAccount: '',
}
