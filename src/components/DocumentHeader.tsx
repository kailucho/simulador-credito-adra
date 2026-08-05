import { formatDateTime } from '../utils/dates'
import { formatMoney } from '../utils/currency'
import type { CreditInput } from '../domain/creditTypes'

interface DocumentHeaderProps {
  input: CreditInput
  lifeInsurance: number
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

export function DocumentHeader({ input, lifeInsurance, generatedAt }: DocumentHeaderProps) {
  const optionalEntries = (Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>)
    .map((key) => [key, input[key as keyof CreditInput] as string | undefined] as const)
    .filter(([, value]) => value && value.trim().length > 0)

  const leftColumn = [
    ['Monto del crédito', `S/ ${formatMoney(input.amount)}`],
    ['Número de cuotas', String(input.installments)],
    ['Tasa mensual', `${input.monthlyRate}%`],
    ['Fecha de desembolso', input.disbursementDate],
    ['Frecuencia', '4 semanas (28 días)'],
    ['Moneda', 'Soles (S/)'],
  ]

  const rightColumn: Array<[string, string]> = [
    ['Fecha de primera cuota', input.firstDueDate],
    ['Aporte programado', '10%'],
    ['Microseguro', `S/ ${formatMoney(lifeInsurance)}`],
    ['Socio aval', 'SOLIDARIO'],
    ...optionalEntries.map(([key, value]) => [FIELD_LABELS[key], value as string] as [string, string]),
  ]

  return (
    <header className="document-header">
      <div className="document-header__top">
        <div className="document-header__brand">ADRA</div>
        <div className="document-header__generated">Generado: {formatDateTime(generatedAt)}</div>
      </div>
      <h1 className="document-header__title">CRONOGRAMA DE PAGOS - GRUPAL NORMAL 28 DÍAS</h1>
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
          {rightColumn.map(([label, value]) => (
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
