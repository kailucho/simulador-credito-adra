# Simulador de Crédito ADRA — Grupal Normal 28 Días

Simulador web del cronograma de pagos **"Grupal Normal 28 Días"**, calculado con **interés a
rebatir** (el interés se calcula sobre el saldo de capital pendiente, no sobre el monto original).

Es una aplicación 100% frontend: React + TypeScript + Vite, sin backend, sin base de datos y sin
conexión a internet requerida una vez compilada.

## ⚠️ Advertencia importante

La fórmula de cálculo utilizada en este simulador **fue obtenida mediante ingeniería inversa** de
cronogramas reales proporcionados como referencia. **No es la fórmula oficial de ADRA.** Verifique
siempre los resultados con la metodología oficial antes de usarlos para operaciones reales. Esta
misma advertencia se muestra en la propia aplicación, debajo del cronograma.

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

Incluye 23 pruebas unitarias que verifican, entre otras cosas, los 3 casos de referencia
obligatorios (montos S/300, S/500 y S/3000) al céntimo exacto, la separación de 28 días entre
cuotas, que el saldo final llegue a cero, que el aporte total sea el 10% del monto, que el
microseguro sea `cuotas × S/1.20`, y que ningún valor resulte `NaN` o `Infinity`.

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

## Explicación resumida de la fórmula

1. La tasa mensual ingresada (por ejemplo `5`, es decir 5%) se convierte a decimal:
   `monthlyRateDecimal = monthlyRate / 100`.
2. Se derivan dos tasas distintas (constantes obtenidas por ingeniería inversa):
   - Primera cuota: `firstRate = monthlyRateDecimal * 0.8348`
   - Cuotas siguientes: `regularRate = monthlyRateDecimal * 0.90046`
3. Se calcula, mediante **búsqueda binaria** (200 iteraciones), la cuota constante teórica que
   cancela el saldo tras el número de cuotas ingresado, usando `firstRate` en la cuota 1 y
   `regularRate` en el resto.
4. La cuota programada es `Math.ceil(cuotaTeórica)`. Todas las cuotas, salvo la última, usan este
   importe entero.
5. El interés de cada cuota se calcula **a rebatir**, sobre el saldo pendiente (`balance * rate`),
   redondeado a 2 decimales.
6. El capital de cada cuota es `total de cuota − interés`.
7. El **saldo interno** se mantiene con todos sus decimales entre cuotas (no se redondea), para
   reproducir exactamente los céntimos de los cronogramas de referencia. Solo se redondean los
   valores que se muestran en pantalla.
8. La última cuota cancela todo el saldo restante: su interés, total y capital se recalculan sobre
   el saldo real y el saldo final queda en cero.
9. El **aporte programado** total es el 10% del monto (`round2(monto * 0.10)`), distribuido en
   partes iguales redondeadas hacia arriba, con el remanente ajustado en la última cuota.
10. El **microseguro** (`cuotas × S/1.20`) se muestra solo en la cabecera informativa; no se suma
    de nuevo en las cuotas ni en los totales de la tabla.

Toda la lógica vive en un único módulo central: [`src/domain/creditCalculator.ts`](src/domain/creditCalculator.ts),
con una única función de redondeo (`round2`) reutilizada en todo el cálculo.

## Casos de prueba utilizados

Los siguientes casos (4 cuotas, tasa mensual 5%) fueron verificados al céntimo exacto y están
codificados en `src/tests/creditCalculator.test.ts`:

| Monto | Total capital | Total interés+cargos | Total cuotas | Total aporte | Total general |
|-------|---------------|-----------------------|--------------|---------------|----------------|
| S/300  | 300.00  | 33.28  | 333.28  | 30.00  | 363.28  |
| S/500  | 500.00  | 55.75  | 555.75  | 50.00  | 605.75  |
| S/3000 | 3000.00 | 334.50 | 3334.50 | 300.00 | 3634.50 |

## Estructura del proyecto

```
src/
  components/
    CreditForm.tsx        # Formulario principal + datos opcionales + botones
    CreditSchedule.tsx     # Tabla del cronograma con fila de totales
    DocumentHeader.tsx     # Encabezado tipo documento (marca, título, datos)
    PaymentReference.tsx   # Referencia de pagos + nota de descargo
  domain/
    creditCalculator.ts    # round2, búsqueda binaria, cálculo del cronograma, validación
    creditTypes.ts         # Tipos del dominio
    defaultCreditInput.ts  # Valores predeterminados del formulario
  utils/
    dates.ts               # Parseo/format de fechas locales, +28 días, días en español
    currency.ts             # Formato monetario es-PE
  tests/
    creditCalculator.test.ts
  App.tsx
  main.tsx
  styles.css                # Incluye estilos de impresión horizontal (@media print)
```
