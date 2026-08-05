import { useMemo, useState } from 'react'
import { CreditForm } from './components/CreditForm'
import { CreditSchedule } from './components/CreditSchedule'
import { DocumentHeader } from './components/DocumentHeader'
import { PaymentReference } from './components/PaymentReference'
import { calculateSchedule, validateCreditInput } from './domain/creditCalculator'
import { DEFAULT_CREDIT_INPUT } from './domain/defaultCreditInput'
import type { CreditInput, ScheduleResult, ValidationErrors } from './domain/creditTypes'

function App() {
  const [formValue, setFormValue] = useState<CreditInput>(DEFAULT_CREDIT_INPUT)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null)
  const [submittedInput, setSubmittedInput] = useState<CreditInput>(DEFAULT_CREDIT_INPUT)
  const [generatedAt, setGeneratedAt] = useState<Date>(new Date())

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors])

  function handleSimulate() {
    const validationErrors = validateCreditInput(formValue)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setSchedule(null)
      return
    }

    setSchedule(calculateSchedule(formValue))
    setSubmittedInput(formValue)
    setGeneratedAt(new Date())
  }

  function handleReset() {
    setFormValue(DEFAULT_CREDIT_INPUT)
    setErrors({})
    setSchedule(calculateSchedule(DEFAULT_CREDIT_INPUT))
    setSubmittedInput(DEFAULT_CREDIT_INPUT)
    setGeneratedAt(new Date())
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="app">
      <CreditForm
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
          <DocumentHeader input={submittedInput} lifeInsurance={schedule.lifeInsurance} generatedAt={generatedAt} />
          <CreditSchedule schedule={schedule} />
          <PaymentReference />
        </div>
      )}
    </div>
  )
}

export default App
