import { useState } from 'react'
import type { FormEvent } from 'react'
import { Users, Coins, Calculator, Percent, Calendar, ChevronDown, ChevronUp, Printer, RotateCcw } from 'lucide-react'
import { PRODUCT_LIST, getProduct } from '../domain/products/productCatalog'
import type { ProductId } from '../domain/products/productTypes'
import type { CreditInput, ValidationErrors } from '../domain/schedule/scheduleTypes'
import { InputField } from './InputField'

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
        <InputField label="Producto" icon={<Users size={18} aria-hidden="true" />} htmlFor="field-product" wide>
          <select id="field-product" value={productId} onChange={(event) => onProductChange(event.target.value as ProductId)}>
            {PRODUCT_LIST.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown className="field__chevron" size={16} aria-hidden="true" />
        </InputField>
      </div>

      <div className="credit-form__grid">
        <InputField label="Monto del crédito (S/)" icon={<Coins size={18} aria-hidden="true" />} htmlFor="field-amount" error={errors.amount}>
          <input
            id="field-amount"
            type="number"
            min="0"
            step="0.01"
            value={Number.isNaN(value.amount) ? '' : value.amount}
            onChange={(event) => handleNumberChange('amount', event.target.value)}
          />
        </InputField>

        <InputField label="Número de cuotas" icon={<Calculator size={18} aria-hidden="true" />} htmlFor="field-installments" error={errors.installments}>
          <input
            id="field-installments"
            type="number"
            min="1"
            max="60"
            step="1"
            value={Number.isNaN(value.installments) ? '' : value.installments}
            onChange={(event) => handleNumberChange('installments', event.target.value)}
          />
        </InputField>

        <InputField label="Tasa mensual (%)" icon={<Percent size={18} aria-hidden="true" />} htmlFor="field-rate" error={errors.monthlyRate}>
          <input
            id="field-rate"
            type="number"
            min="0"
            step="0.01"
            value={Number.isNaN(value.monthlyRate) ? '' : value.monthlyRate}
            onChange={(event) => handleNumberChange('monthlyRate', event.target.value)}
          />
        </InputField>

        <InputField label="Fecha de desembolso" icon={<Calendar size={18} aria-hidden="true" />} htmlFor="field-disbursement" error={errors.disbursementDate}>
          <input
            id="field-disbursement"
            type="date"
            value={value.disbursementDate}
            onChange={(event) => handleTextChange('disbursementDate', event.target.value)}
          />
        </InputField>

        <InputField label="Fecha de la primera cuota" icon={<Calendar size={18} aria-hidden="true" />} htmlFor="field-first-due" error={errors.firstDueDate}>
          <input
            id="field-first-due"
            type="date"
            value={value.firstDueDate}
            onChange={(event) => handleTextChange('firstDueDate', event.target.value)}
          />
        </InputField>

        {isMonthly && (
          <InputField
            label="Día contractual de pago"
            icon={<Calendar size={18} aria-hidden="true" />}
            htmlFor="field-payment-day"
            error={errors.nominalPaymentDay}
          >
            <input
              id="field-payment-day"
              type="number"
              min="1"
              max="31"
              step="1"
              value={Number.isNaN(value.nominalPaymentDay) || value.nominalPaymentDay === undefined ? '' : value.nominalPaymentDay}
              onChange={(event) => handleNumberChange('nominalPaymentDay', event.target.value)}
            />
          </InputField>
        )}
      </div>

      <div className="credit-form__accordion">
        <button
          type="button"
          className="credit-form__accordion-toggle"
          aria-expanded={showOptional}
          onClick={() => setShowOptional((prev) => !prev)}
        >
          <span>Datos opcionales</span>
          {showOptional ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
        </button>
        <div className={`credit-form__accordion-panel${showOptional ? ' credit-form__accordion-panel--open' : ''}`}>
          <div className="credit-form__accordion-inner">
            <div className="credit-form__grid">
              {OPTIONAL_FIELDS.map(({ key, label }) => (
                <div className="field" key={key}>
                  <label className="field__label" htmlFor={`field-${key}`}>
                    {label}
                  </label>
                  <div className="field__control">
                    <input
                      id={`field-${key}`}
                      type="text"
                      value={(value[key] as string) ?? ''}
                      onChange={(event) => handleTextChange(key, event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button type="submit" className="credit-form__submit">
        Simular cronograma
      </button>

      <div className="credit-form__secondary-actions">
        <button type="button" className="credit-form__button" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" />
          Restablecer ejemplo
        </button>
        <button type="button" className="credit-form__button" onClick={onPrint}>
          <Printer size={16} aria-hidden="true" />
          Imprimir / Guardar PDF
        </button>
      </div>
    </form>
  )
}
