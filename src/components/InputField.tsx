import type { ReactNode } from 'react'

interface InputFieldProps {
  label: string
  icon: ReactNode
  error?: string
  wide?: boolean
  htmlFor: string
  children: ReactNode
}

export function InputField({ label, icon, error, wide, htmlFor, children }: InputFieldProps) {
  return (
    <div className={`field${wide ? ' field--wide' : ''}`}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      <div className={`field__control${error ? ' field__control--error' : ''}`}>
        <span className="field__icon" aria-hidden="true">
          {icon}
        </span>
        {children}
      </div>
      {error && <span className="field__error">{error}</span>}
    </div>
  )
}
