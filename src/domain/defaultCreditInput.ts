import type { CreditInput } from './schedule/scheduleTypes'
import type { ProductId } from './products/productTypes'
import { getProduct } from './products/productCatalog'

export const DEFAULT_PRODUCT_ID: ProductId = 'GRUPAL_NORMAL_28'

const BASE_OPTIONAL_FIELDS = {
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

export const DEFAULT_CREDIT_INPUT: CreditInput = {
  amount: 500,
  installments: 4,
  monthlyRate: 5,
  disbursementDate: '2026-07-30',
  firstDueDate: '2026-08-25',
  ...BASE_OPTIONAL_FIELDS,
}

/** Construye un CreditInput por defecto razonable para el producto dado (tasa precargada, editable). */
export function defaultInputForProduct(productId: ProductId): CreditInput {
  const product = getProduct(productId)

  if (product.engine === 'GROUP_28') {
    return { ...DEFAULT_CREDIT_INPUT, monthlyRate: product.defaultMonthlyRate }
  }

  return {
    amount: 5000,
    installments: 12,
    monthlyRate: product.defaultMonthlyRate,
    disbursementDate: '2026-07-30',
    firstDueDate: '2026-08-10',
    nominalPaymentDay: 10,
    ...BASE_OPTIONAL_FIELDS,
  }
}
