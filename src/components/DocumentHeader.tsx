import { formatDateTime } from '../utils/dates'
import { formatMoney } from '../utils/currency'
import type { ProductDefinition } from '../domain/products/productTypes'
import type { CreditInput, Group28ScheduleResult, MonthlyScheduleResult } from '../domain/schedule/scheduleTypes'

interface DocumentHeaderProps {
  product: ProductDefinition
  input: CreditInput
  schedule: Group28ScheduleResult | MonthlyScheduleResult
  generatedAt: Date
}

const FIELD_LABELS: Record<string, string> = {
  operationNumber: 'N° de operación',
  creditNumber: 'N° de crédito',
  memberName: 'Nombre del socio',
  documentId: 'Documento de identidad',
  serviceAdvisor: 'Asesor de servicio',
  communalAssociation: 'Asociación comunal',
  associationCycle: 'Ciclo de la asociación comunal',
  memberCycle: 'Ciclo del socio',
  contributionsBalance: 'Saldo de aportes',
  associationBankAccount: 'Cuenta bancaria de la asociación',
}

function isGroup28Schedule(schedule: Group28ScheduleResult | MonthlyScheduleResult): schedule is Group28ScheduleResult {
  return 'lifeInsurance' in schedule
}

export function DocumentHeader({ product, input, schedule, generatedAt }: DocumentHeaderProps) {
  const optionalEntries = (Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>)
    .map((key) => [key, input[key as keyof CreditInput] as string | undefined] as const)
    .filter(([, value]) => value && value.trim().length > 0)

  const leftColumn: Array<[string, string]> = [
    ['Monto del crédito', `S/ ${formatMoney(input.amount)}`],
    ['Número de cuotas', String(input.installments)],
    ['Tasa mensual', `${input.monthlyRate}%`],
    ['Fecha de desembolso', input.disbursementDate],
    ['Frecuencia', product.engine === 'GROUP_28' ? '4 semanas (28 días)' : '1 MES(ES)'],
    ['Moneda', 'Soles (S/)'],
  ]

  const rightColumn: Array<[string, string]> = isGroup28Schedule(schedule)
    ? [
        ['Fecha de primera cuota', input.firstDueDate],
        ['Aporte programado', '10%'],
        ['Microseguro', `S/ ${formatMoney(schedule.lifeInsurance)}`],
        ['Socio aval', 'SOLIDARIO'],
      ]
    : [
        ['Fecha de primera cuota', input.firstDueDate],
        ['Día contractual de pago', String(input.nominalPaymentDay ?? '')],
        ['Fondo de cobertura', '0.09309%'],
      ]

  const allRightEntries = [...rightColumn, ...optionalEntries.map(([key, value]) => [FIELD_LABELS[key], value as string] as [string, string])]

  return (
    <header className="document-header">
      <div className="document-header__top">
        <div className="document-header__brand">ADRA</div>
        <div className="document-header__generated">Generado: {formatDateTime(generatedAt)}</div>
      </div>
      <h1 className="document-header__title">{product.documentTitle}</h1>
      <div className="document-header__info">
        <dl className="document-header__column">
          {leftColumn.map(([label, value]) => (
            <div className="document-header__row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <dl className="document-header__column">
          {allRightEntries.map(([label, value]) => (
            <div className="document-header__row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  )
}
