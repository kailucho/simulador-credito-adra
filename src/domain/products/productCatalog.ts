import type { ProductDefinition, ProductId } from './productTypes'

// Tasas precargadas observadas en las muestras de referencia (ver
// docs/reverse-engineering). Son valores por defecto editables por el
// usuario, no constantes del motor: el motor MONTHLY_COMMON no lee este
// archivo ni conoce ningún id de producto.
export const PRODUCT_CATALOG: Record<ProductId, ProductDefinition> = {
  GRUPAL_NORMAL_28: {
    id: 'GRUPAL_NORMAL_28',
    label: 'Crédito Grupal Normal 28 días',
    documentTitle: 'CRONOGRAMA DE PAGOS - GRUPAL NORMAL 28 DÍAS',
    engine: 'GROUP_28',
    defaultMonthlyRate: 5,
  },
  CREDITO_EDUCATIVO: {
    id: 'CREDITO_EDUCATIVO',
    label: 'Crédito Educativo',
    documentTitle: 'CRONOGRAMA DE PAGOS - CREDITO EDUCATIVO',
    engine: 'MONTHLY_COMMON',
    defaultMonthlyRate: 4.0,
  },
  CREDITO_CAMPANA: {
    id: 'CREDITO_CAMPANA',
    label: 'Crédito Campaña',
    documentTitle: 'CRONOGRAMA DE PAGOS - CREDITO CAMPAÑA',
    engine: 'MONTHLY_COMMON',
    defaultMonthlyRate: 2.8,
  },
  ADRAWASH: {
    id: 'ADRAWASH',
    label: 'ADRAWASH',
    documentTitle: 'CRONOGRAMA DE PAGOS - ADRAWASH',
    engine: 'MONTHLY_COMMON',
    defaultMonthlyRate: 3.0,
  },
  MEJORANDO_MI_HOGAR: {
    id: 'MEJORANDO_MI_HOGAR',
    label: 'Mejorando Mi Hogar',
    documentTitle: 'CRONOGRAMA DE PAGOS - MEJORANDO MI HOGAR',
    engine: 'MONTHLY_COMMON',
    defaultMonthlyRate: 3.2,
  },
  CREDITO_COMPLEMENTARIO: {
    id: 'CREDITO_COMPLEMENTARIO',
    label: 'Crédito Complementario',
    documentTitle: 'CRONOGRAMA DE PAGOS - CREDITO COMPLEMENTARIO',
    engine: 'MONTHLY_COMMON',
    defaultMonthlyRate: 4.2,
  },
}

export const PRODUCT_LIST: ProductDefinition[] = Object.values(PRODUCT_CATALOG)

export function getProduct(id: ProductId): ProductDefinition {
  return PRODUCT_CATALOG[id]
}
