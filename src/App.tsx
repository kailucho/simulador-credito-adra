import { useMemo, useState } from 'react'
import { CreditForm } from './components/CreditForm'
import { CreditSchedule } from './components/CreditSchedule'
import { DocumentHeader } from './components/DocumentHeader'
import { PaymentReference } from './components/PaymentReference'
import { calculateGroup28Schedule, validateGroup28Input } from './domain/engines/group28Calculator'
import { calculateMonthlySchedule, validateMonthlyInput } from './domain/engines/monthlyCalculator'
import { DEFAULT_PRODUCT_ID, defaultInputForProduct } from './domain/defaultCreditInput'
import { getProduct } from './domain/products/productCatalog'
import type { ProductId } from './domain/products/productTypes'
import type {
  CreditInput,
  Group28ScheduleResult,
  MonthlyScheduleResult,
  ValidationErrors,
} from './domain/schedule/scheduleTypes'

type ScheduleState =
  | { engine: 'GROUP_28'; result: Group28ScheduleResult }
  | { engine: 'MONTHLY_COMMON'; result: MonthlyScheduleResult }

function App() {
  const [productId, setProductId] = useState<ProductId>(DEFAULT_PRODUCT_ID)
  const [formValue, setFormValue] = useState<CreditInput>(defaultInputForProduct(DEFAULT_PRODUCT_ID))
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [schedule, setSchedule] = useState<ScheduleState | null>(null)
  const [submittedInput, setSubmittedInput] = useState<CreditInput>(formValue)
  const [generatedAt, setGeneratedAt] = useState<Date>(new Date())

  const product = getProduct(productId)
  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors])

  function handleProductChange(nextProductId: ProductId) {
    setProductId(nextProductId)
    setFormValue(defaultInputForProduct(nextProductId))
    setErrors({})
    setSchedule(null)
  }

  function handleSimulate() {
    const validationErrors = product.engine === 'GROUP_28' ? validateGroup28Input(formValue) : validateMonthlyInput(formValue)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setSchedule(null)
      return
    }

    if (product.engine === 'GROUP_28') {
      setSchedule({ engine: 'GROUP_28', result: calculateGroup28Schedule(formValue) })
    } else {
      setSchedule({ engine: 'MONTHLY_COMMON', result: calculateMonthlySchedule(formValue) })
    }
    setSubmittedInput(formValue)
    setGeneratedAt(new Date())
  }

  function handleReset() {
    const defaults = defaultInputForProduct(productId)
    setFormValue(defaults)
    setErrors({})
    if (product.engine === 'GROUP_28') {
      setSchedule({ engine: 'GROUP_28', result: calculateGroup28Schedule(defaults) })
    } else {
      setSchedule({ engine: 'MONTHLY_COMMON', result: calculateMonthlySchedule(defaults) })
    }
    setSubmittedInput(defaults)
    setGeneratedAt(new Date())
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="app">
      <CreditForm
        productId={productId}
        onProductChange={handleProductChange}
        value={formValue}
        errors={errors}
        onChange={setFormValue}
        onSubmit={handleSimulate}
        onReset={handleReset}
        onPrint={handlePrint}
      />

      {hasErrors && (
        <div className="app__error-banner no-print" role="alert">
          Por favor corrija los errores del formulario antes de simular el cronograma.
        </div>
      )}

      {schedule && (
        <div className="document">
          <DocumentHeader product={product} input={submittedInput} schedule={schedule.result} generatedAt={generatedAt} />
          <CreditSchedule schedule={schedule} />
          <PaymentReference />
        </div>
      )}
    </div>
  )
}

export default App
