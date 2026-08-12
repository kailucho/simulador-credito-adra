import { formatMoney } from '../utils/currency'
import type { Group28ScheduleResult, MonthlyScheduleResult } from '../domain/schedule/scheduleTypes'

type ScheduleProp =
  | { engine: 'GROUP_28'; result: Group28ScheduleResult }
  | { engine: 'MONTHLY_COMMON'; result: MonthlyScheduleResult }

interface CreditScheduleProps {
  schedule: ScheduleProp
}

export function CreditSchedule({ schedule }: CreditScheduleProps) {
  if (schedule.engine === 'GROUP_28') {
    const { rows, totals } = schedule.result
    return (
      <table className="schedule-table">
        <thead>
          <tr>
            <th>CUOTA</th>
            <th>DÍA Y FECHA VENCIMIENTO</th>
            <th>CAPITAL</th>
            <th>INTERÉS + CARGOS</th>
            <th>TOTAL CUOTA</th>
            <th>APORTE PROGRAMADO</th>
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.installmentNumber}>
              <td className="schedule-table__center">{row.installmentNumber}</td>
              <td>{row.dueDateLabel}</td>
              <td className="schedule-table__amount">{formatMoney(row.principal)}</td>
              <td className="schedule-table__amount">{formatMoney(row.interestCharges)}</td>
              <td className="schedule-table__amount">{formatMoney(row.installmentTotal)}</td>
              <td className="schedule-table__amount">{formatMoney(row.contribution)}</td>
              <td className="schedule-table__amount">{formatMoney(row.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="schedule-table__totals">
            <td colSpan={2}>TOTAL GENERAL</td>
            <td className="schedule-table__amount">{formatMoney(totals.principal)}</td>
            <td className="schedule-table__amount">{formatMoney(totals.interestCharges)}</td>
            <td className="schedule-table__amount">{formatMoney(totals.installmentTotal)}</td>
            <td className="schedule-table__amount">{formatMoney(totals.contribution)}</td>
            <td className="schedule-table__amount">{formatMoney(totals.total)}</td>
          </tr>
        </tfoot>
      </table>
    )
  }

  const { rows, totals } = schedule.result
  return (
    <table className="schedule-table">
      <thead>
        <tr>
          <th>CUOTA</th>
          <th>DÍA Y FECHA VENCIMIENTO</th>
          <th>CAPITAL</th>
          <th>INTERÉS + CARGOS</th>
          <th>FONDO COBERTURA</th>
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.installmentNumber}>
            <td className="schedule-table__center">{row.installmentNumber}</td>
            <td>{row.dueDateLabel}</td>
            <td className="schedule-table__amount">{formatMoney(row.principal)}</td>
            <td className="schedule-table__amount">{formatMoney(row.interestCharges)}</td>
            <td className="schedule-table__amount">{formatMoney(row.coverageFund)}</td>
            <td className="schedule-table__amount">{formatMoney(row.total)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="schedule-table__totals">
          <td colSpan={2}>TOTAL GENERAL</td>
          <td className="schedule-table__amount">{formatMoney(totals.principal)}</td>
          <td className="schedule-table__amount">{formatMoney(totals.interestCharges)}</td>
          <td className="schedule-table__amount">{formatMoney(totals.coverageFund)}</td>
          <td className="schedule-table__amount">{formatMoney(totals.total)}</td>
        </tr>
      </tfoot>
    </table>
  )
}
