import { formatDateTime } from '../utils/dates'
import type { ProductDefinition } from '../domain/products/productTypes'
import type { Group28ScheduleResult, MonthlyScheduleResult } from '../domain/schedule/scheduleTypes'

interface DocumentHeaderProps {
  product: ProductDefinition
  schedule: Group28ScheduleResult | MonthlyScheduleResult
  generatedAt: Date
}

function isGroup28Schedule(schedule: Group28ScheduleResult | MonthlyScheduleResult): schedule is Group28ScheduleResult {
  return 'lifeInsurance' in schedule
}

export function DocumentHeader({ product, schedule, generatedAt }: DocumentHeaderProps) {
  const frequencyLabel = isGroup28Schedule(schedule) ? '28 días' : 'Mensual'

  return (
    <header className="document-header">
      <div className="document-header__top">
        <div className="document-header__titles">
          <h2 className="document-header__title">Cronograma de pagos</h2>
          <span className="document-header__badge">{frequencyLabel}</span>
        </div>
        <p className="document-header__subtitle">Resultados de la simulación</p>
      </div>
      <p className="document-header__generated no-print">Generado: {formatDateTime(generatedAt)}</p>
      <p className="document-header__product-title print-only">{product.documentTitle}</p>
    </header>
  )
}
