# Simulador de Crédito ADRA — Multiproducto

Simulador web de cronogramas de pago para 6 productos de crédito ADRA, calculados con
**interés a rebatir** (el interés se calcula sobre el saldo de capital pendiente, no sobre el
monto original):

- Crédito Grupal Normal 28 días
- Crédito Educativo
- Crédito Campaña
- ADRAWASH
- Mejorando Mi Hogar
- Crédito Complementario

Es una aplicación 100% frontend: React + TypeScript + Vite, sin backend, sin base de datos y sin
conexión a internet requerida una vez compilada.

## ⚠️ Advertencia importante

Las fórmulas de cálculo utilizadas en este simulador **fueron obtenidas mediante ingeniería
inversa** de cronogramas reales proporcionados como referencia. **No son las fórmulas oficiales de
ADRA.** Verifique siempre los resultados con la metodología oficial antes de usarlos para
operaciones reales. Esta misma advertencia se muestra en la propia aplicación, debajo del
cronograma.

Para los 5 productos de cuota mensual (todo menos Grupal Normal 28 días), la investigación **no
logró identificar una fórmula que reproduzca el 100% de las 51 cuotas reales de referencia al
céntimo**. El detalle completo — qué se probó, qué se descartó y por qué, y qué haría falta para
cerrar la brecha — está documentado en
[`docs/reverse-engineering/findings.md`](docs/reverse-engineering/findings.md).

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Instalación

```bash
npm install
```

## Ejecución local

```bash
npm run dev
```

Abre la URL que indique la terminal (por defecto `http://localhost:5173`).

## Pruebas

```bash
npm run test
```

302 pruebas unitarias en 4 archivos:

- **`group28Calculator.test.ts`** (23 pruebas): los 3 casos de referencia obligatorios (montos
  S/300, S/500 y S/3000) al céntimo exacto, separación de 28 días entre cuotas, saldo final en
  cero, aporte total 10% del monto, microseguro `cuotas × S/1.20`, sin `NaN`/`Infinity`.
- **`monthlyCalculator.reference.test.ts`** (262 pruebas): las 51 cuotas reales de los 5 productos
  mensuales, comparadas celda por celda **sin tolerancias**. Las celdas donde la fórmula elegida
  no coincide con la referencia (documentadas en `findings.md`) se marcan explícitamente como
  fallo esperado (`it.fails`-style), de modo que cualquier mejora futura de la fórmula que
  empiece a coincidir lo señale como una prueba rota que hay que actualizar — no queda oculta
  detrás de una tolerancia.
- **`dates.test.ts`** (13 pruebas): calendario peruano de negocios, incluidos los 8 corrimientos
  de fecha explícitos requeridos (feriados fijos, Jueves/Viernes Santo, fines de semana), y la
  regla de que la cuota siguiente vuelve al día contractual sin arrastrar el corrimiento.
- **`monthlyEngineIsolation.test.ts`** (4 pruebas, anti-hack): verifica de forma estática que el
  motor mensual no contiene ningún id de producto ni importa datos de referencia/fixtures.

## Compilación para producción

```bash
npm run build
```

Genera la carpeta `dist/` lista para desplegar. Puedes previsualizarla con:

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Despliegue en Vercel

1. Sube el repositorio a GitHub (ver sección Git más abajo).
2. En [vercel.com](https://vercel.com), importa el repositorio.
3. Configuración (Vercel la detecta automáticamente al ser un proyecto Vite):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Despliega. No se requiere `vercel.json` ni variables de entorno.

También puedes desplegar desde la CLI:

```bash
npx vercel        # despliegue de preview
npx vercel --prod # despliegue de producción
```

## Arquitectura: dos motores, seis productos

El sistema tiene exactamente **dos motores financieros**, seleccionados por el catálogo de
productos (`src/domain/products/productCatalog.ts`) según el producto elegido en el selector.
Ningún motor conoce el id del producto que lo está usando.

### GROUP_28 — Crédito Grupal Normal 28 días

Preserva exactamente el comportamiento verificado antes del refactor multiproducto.

1. La tasa mensual ingresada (por ejemplo `5`, es decir 5%) se convierte a decimal.
2. Se derivan dos tasas (constantes obtenidas por ingeniería inversa): primera cuota
   `firstRate = monthlyRateDecimal × 0.8348`, cuotas siguientes
   `regularRate = monthlyRateDecimal × 0.90046`.
3. Búsqueda binaria (200 iteraciones) de la cuota constante teórica que cancela el saldo.
4. Cuota programada = `Math.ceil(cuotaTeórica)`.
5. Interés a rebatir sobre el saldo pendiente, redondeado a 2 decimales. Capital = total − interés.
6. El saldo interno no se redondea entre cuotas (solo los valores mostrados).
7. La última cuota liquida el saldo real restante.
8. Aporte programado = 10% del monto, repartido en partes iguales con remanente en la última cuota.
9. Microseguro = `cuotas × S/1.20`, mostrado solo en la cabecera.

Vencimientos cada 28 días exactos, **sin ajuste de feriados**. Código:
[`src/domain/engines/group28Calculator.ts`](src/domain/engines/group28Calculator.ts).

### MONTHLY_COMMON — Educativo, Campaña, ADRAWASH, Mejorando Mi Hogar, Complementario

Un único motor, parametrizado únicamente por `CreditInput` (monto, cuotas, tasa, fechas, día
contractual de pago). Código:
[`src/domain/engines/monthlyCalculator.ts`](src/domain/engines/monthlyCalculator.ts).

**Fechas** (100% exacto, ver `docs/reverse-engineering/findings.md` §1.1): cada cuota tiene una
fecha nominal (mismo día del mes que el día contractual, avanzando un mes calendario por cuota).
La fecha mostrada y usada para el devengo es esa fecha nominal avanzada al siguiente día hábil si
cae en fin de semana o feriado (calendario en
[`src/utils/peruBusinessCalendar.ts`](src/utils/peruBusinessCalendar.ts), separado deliberadamente
de la matemática financiera). La cuota siguiente vuelve al día contractual original, sin arrastrar
el corrimiento.

**Interés**: `interestRate = (1 + monthlyRateDecimal) ** (díasEfectivos / 30) - 1`, interés a
rebatir sobre el saldo, base de 30 días por mes. Es la fórmula más simple y auditable encontrada
tras una búsqueda sistemática de 864 modelos candidatos
(`scripts/reverse-engineer-monthly.ts`); **no reproduce el 100% de las cuotas de referencia** — ver
`findings.md` para el detalle exacto de qué falla y por qué se prefirió esta fórmula sobre
alternativas con mejor ajuste bruto pero sin justificación financiera (sobreajuste a los datos de
prueba).

**Fondo de cobertura**: `saldo_actual × 0.09309% × meses_nominales_cruzados`, redondeado a 2
decimales.

**Cuota fija**: búsqueda binaria (misma técnica que GROUP_28) sobre el pago constante que amortiza
el monto con la fórmula de interés y fondo anteriores, redondeado al sol entero superior.

## Investigación de ingeniería inversa

```bash
npx tsx scripts/reverse-engineer-monthly.ts
```

Evalúa 864 combinaciones de función de tasa × regla de fondo × política de redondeo × precisión de
saldo contra las 51 cuotas reales de `docs/reverse-engineering/reference-schedules.json`, y reporta
celdas exactas, error medio absoluto, error máximo, y desglose por producto / días / número de
cuota. El detalle narrativo de la investigación — hipótesis probadas, evidencia, y qué se
necesitaría para cerrar la brecha restante — está en
[`docs/reverse-engineering/findings.md`](docs/reverse-engineering/findings.md).

## Casos de prueba utilizados

### Grupal Normal 28 días (4 cuotas, tasa mensual 5%)

| Monto | Total capital | Total interés+cargos | Total cuotas | Total aporte | Total general |
|-------|---------------|-----------------------|--------------|---------------|----------------|
| S/300  | 300.00  | 33.28  | 333.28  | 30.00  | 363.28  |
| S/500  | 500.00  | 55.75  | 555.75  | 50.00  | 605.75  |
| S/3000 | 3000.00 | 334.50 | 3334.50 | 300.00 | 3634.50 |

### Productos mensuales

Los 5 cronogramas completos (51 cuotas) están en
[`docs/reverse-engineering/reference-schedules.json`](docs/reverse-engineering/reference-schedules.json):
Crédito Educativo (S/5,000, 12 cuotas, 4.00%), Crédito Campaña (S/800, 1 cuota, 2.80%), ADRAWASH
(S/10,000, 18 cuotas, 3.00%), Mejorando Mi Hogar (S/10,000, 12 cuotas, 3.20%) y Crédito
Complementario (S/7,000, 8 cuotas, 4.20%).

## Estructura del proyecto

```
src/
  components/
    CreditForm.tsx           # Selector de producto + formulario + datos opcionales + botones
    CreditSchedule.tsx        # Tabla del cronograma (columnas según motor) con fila de totales
    DocumentHeader.tsx        # Encabezado tipo documento (marca, título dinámico, datos)
    PaymentReference.tsx      # Referencia de pagos + nota de descargo
  domain/
    products/
      productTypes.ts         # ProductId, EngineId, ProductDefinition
      productCatalog.ts        # Catálogo de los 6 productos: motor, título, tasa por defecto
    engines/
      group28Calculator.ts     # Motor GROUP_28 (sin cambios de comportamiento)
      monthlyCalculator.ts     # Motor MONTHLY_COMMON (único, sin ids de producto)
      financialMath.ts          # round2 centralizado
    schedule/
      scheduleTypes.ts          # CreditInput y tipos de resultado de ambos motores
    defaultCreditInput.ts       # Valores predeterminados por producto
  utils/
    dates.ts                  # Parseo/format de fechas locales, +28 días, días en español
    peruBusinessCalendar.ts    # Calendario de feriados/fines de semana (aislado de la matemática)
    currency.ts                # Formato monetario es-PE
  tests/
    fixtures/
      referenceSchedules.ts    # Carga tipada de docs/reverse-engineering/reference-schedules.json
    group28Calculator.test.ts
    monthlyCalculator.reference.test.ts
    dates.test.ts
    monthlyEngineIsolation.test.ts
  App.tsx
  main.tsx
  styles.css                  # Incluye estilos de impresión horizontal (@media print)
scripts/
  reverse-engineer-monthly.ts  # Harness de búsqueda de la fórmula mensual
docs/
  reverse-engineering/
    reference-schedules.json   # Fuente de verdad: 3 cronogramas Grupal 28 + 5 mensuales (51 cuotas)
    findings.md                 # Investigación completa: hipótesis, evidencia, brecha restante
```
