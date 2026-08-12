import { useState } from 'react'
import type { FormEvent } from 'react'
import { PRODUCT_LIST, getProduct } from '../domain/products/productCatalog'
import type { ProductId } from '../domain/products/productTypes'
import type { CreditInput, ValidationErrors } from '../domain/schedule/scheduleTypes'

interface CreditFormProps {
  productId: ProductId
  onProductChange: (productId: ProductId) => void
  value: CreditInput
  errors: ValidationErrors
  onChange: (value: CreditInput) => void
  onSubmit: () => void
  onReset: () => void
  onPrint: () => void
}

const OPTIONAL_FIELDS: Array<{ key: keyof CreditInput; label: string }> = [
  { key: 'operationNumber', label: 'Número de operación' },
  { key: 'creditNumber', label: 'Número de crédito' },
  { key: 'memberName', label: 'Nombre del socio' },
  { key: 'documentId', label: 'Documento de identidad' },
  { key: 'serviceAdvisor', label: 'Asesor de servicio' },
  { key: 'communalAssociation', label: 'Asociación comunal' },
  { key: 'associationCycle', label: 'Ciclo de la asociación comunal' },
  { key: 'memberCycle', label: 'Ciclo del socio' },
  { key: 'contributionsBalance', label: 'Saldo de aportes' },
  { key: 'associationBankAccount', label: 'Cuenta bancaria de la asociación' },
]

export function CreditForm({ productId, onProductChange, value, errors, onChange, onSubmit, onReset, onPrint }: CreditFormProps) {
  const [showOptional, setShowOptional] = useState(false)
  const product = getProduct(productId)
  const isMonthly = product.engine === 'MONTHLY_COMMON'

  function handleNumberChange(field: 'amount' | 'installments' | 'monthlyRate' | 'nominalPaymentDay', raw: string) {
    const parsed = raw === '' ? NaN : Number(raw)
    onChange({ ...value, [field]: parsed })
  }

  function handleTextChange(field: keyof CreditInput, raw: string) {
    onChange({ ...value, [field]: raw })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="credit-form no-print" onSubmit={handleSubmit}>
      <div className="credit-form__grid">
        <label className="credit-form__field credit-form__field--wide">
          <span>Producto</span>
          <select value={productId} onChange={(event) => onProductChange(event.target.value as ProductId)}>
            {PRODUCT_LIST.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="credit-form__grid">
        <label className="credit-form__field">
          <span>Monto del crédito (S/)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={Number.isNaN(value.amount) ? '' : value.amount}
            onChange={(event) => handleNumberChange('amount', event.target.value)}
          />
          {errors.amount && <span className="credit-form__error">{errors.amount}</span>}
        </label>

        <label className="credit-form__field">
          <span>Número de cuotas</span>
          <input
            type="number"
            min="1"
            max="60"
            step="1"
            value={Number.isNaN(value.installments) ? '' : value.installments}
            onChange={(event) => handleNumberChange('installments', event.target.value)}
          />
          {errors.installments && <span className="credit-form__error">{errors.installments}</span>}
        </label>

        <label className="credit-form__field">
          <span>Tasa mensual (%)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={Number.isNaN(value.monthlyRate) ? '' : value.monthlyRate}
            onChange={(event) => handleNumberChange('monthlyRate', event.target.value)}
          />
          {errors.monthlyRate && <span className="credit-form__error">{errors.monthlyRate}</span>}
        </label>

        <label className="credit-form__field">
          <span>Fecha de desembolso</span>
          <input
            type="date"
            value={value.disbursementDate}
            onChange={(event) => handleTextChange('disbursementDate', event.target.value)}
          />
          {errors.disbursementDate && <span className="credit-form__error">{errors.disbursementDate}</span>}
        </label>

        <label className="credit-form__field">
          <span>Fecha de la primera cuota</span>
          <input
            type="date"
            value={value.firstDueDate}
            onChange={(event) => handleTextChange('firstDueDate', event.target.value)}
          />
          {errors.firstDueDate && <span className="credit-form__error">{errors.firstDueDate}</span>}
        </label>

        {isMonthly && (
          <label className="credit-form__field">
            <span>Día contractual de pago</span>
            <input
              type="number"
              min="1"
              max="31"
              step="1"
              value={Number.isNaN(value.nominalPaymentDay) || value.nominalPaymentDay === undefined ? '' : value.nominalPaymentDay}
              onChange={(event) => handleNumberChange('nominalPaymentDay', event.target.value)}
            />
            {errors.nominalPaymentDay && <span className="credit-form__error">{errors.nominalPaymentDay}</span>}
          </label>
        )}
      </div>

      <details className="credit-form__optional" open={showOptional} onToggle={(e) => setShowOptional((e.target as HTMLDetailsElement).open)}>
        <summary>Datos opcionales</summary>
        <div className="credit-form__grid">
          {OPTIONAL_FIELDS.map(({ key, label }) => (
            <label className="credit-form__field" key={key}>
              <span>{label}</span>
              <input
                type="text"
                value={(value[key] as string) ?? ''}
                onChange={(event) => handleTextChange(key, event.target.value)}
              />
            </label>
          ))}
        </div>
      </details>

      <div className="credit-form__actions">
        <button type="submit" className="credit-form__button credit-form__button--primary">
          Simular cronograma
        </button>
        <button type="button" className="credit-form__button" onClick={onReset}>
          Restablecer ejemplo
        </button>
        <button type="button" className="credit-form__button" onClick={onPrint}>
          Imprimir / Guardar como PDF
        </button>
      </div>
    </form>
  )
}
