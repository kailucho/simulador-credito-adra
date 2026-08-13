import { Info } from 'lucide-react'

export function PaymentReference() {
  return (
    <section className="payment-reference">
      <span className="payment-reference__icon" aria-hidden="true">
        <Info size={18} />
      </span>
      <div className="payment-reference__body">
        <p>
          Realice sus pagos en las fechas de vencimiento indicadas en el cronograma y mediante los
          canales autorizados por ADRA. El pago fuera de la fecha de vencimiento puede generar cargos
          adicionales no contemplados en esta simulación.
        </p>
        <p className="payment-reference__disclaimer">
          Simulación estimada mediante ingeniería inversa de cronogramas proporcionados. Verifique el
          resultado con la metodología oficial antes de utilizarlo para operaciones reales.
        </p>
      </div>
    </section>
  )
}
