import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRODUCT_LIST } from '../domain/products/productCatalog'

const MONTHLY_ENGINE_PATH = path.resolve(__dirname, '../domain/engines/monthlyCalculator.ts')
const source = readFileSync(MONTHLY_ENGINE_PATH, 'utf8')

// Comprobación estática (anti-hack) requerida por el mandato: el motor
// MONTHLY_COMMON no debe conocer ningún id de producto ni importar fixtures
// de referencia. Si algún día alguien "arregla" una celda agregando un
// `if (productId === 'CREDITO_EDUCATIVO')` o un import de las fixtures de
// test, esta prueba debe fallar.
describe('aislamiento del motor MONTHLY_COMMON (anti-hack)', () => {
  it('no importa fixtures de referencia ni datos de test', () => {
    expect(source).not.toMatch(/reference-schedules|referenceSchedules|fixtures/i)
  })

  it('no contiene ningún id de producto del catálogo', () => {
    for (const product of PRODUCT_LIST) {
      expect(source).not.toContain(product.id)
    }
  })

  it('no contiene literales de nombre de producto conocidos', () => {
    const forbidden = [
      'educativo',
      'campaña',
      'campana',
      'adrawash',
      'mejorando',
      'complementario',
      'grupal',
    ]
    const lowered = source.toLowerCase()
    for (const word of forbidden) {
      expect(lowered).not.toContain(word)
    }
  })

  it('no importa nada de src/domain/products', () => {
    expect(source).not.toMatch(/from ['"].*\/products\//)
  })
})
