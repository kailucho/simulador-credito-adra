export type EngineId = 'GROUP_28' | 'MONTHLY_COMMON'

export type ProductId =
  | 'GRUPAL_NORMAL_28'
  | 'CREDITO_EDUCATIVO'
  | 'CREDITO_CAMPANA'
  | 'ADRAWASH'
  | 'MEJORANDO_MI_HOGAR'
  | 'CREDITO_COMPLEMENTARIO'

export interface ProductDefinition {
  id: ProductId
  /** Nombre mostrado en el selector. */
  label: string
  /** Título mostrado en la cabecera del documento ("CRONOGRAMA DE PAGOS - ..."). */
  documentTitle: string
  engine: EngineId
  /** Tasa mensual (%) precargada por defecto. Siempre editable por el usuario. */
  defaultMonthlyRate: number
}
