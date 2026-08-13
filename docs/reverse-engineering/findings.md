# Ingeniería inversa del motor MONTHLY_COMMON — hallazgos

Este documento registra la investigación sistemática de la fórmula financiera
compartida por Crédito Educativo, Crédito Campaña, ADRAWASH, Mejorando Mi
Hogar y Crédito Complementario, contra las 51 cuotas reales de
`docs/reverse-engineering/reference-schedules.json`.

## 0. Actualización del motor (agosto de 2026)

El dataset contiene ahora 75 cuotas mensuales: las 51 originales y un nuevo
cronograma de Mejorando Mi Hogar por S/18,000 a 24 cuotas. Las secciones 1–5
conservan la investigación histórica sobre las 51 filas originales; esta
sección documenta la implementación vigente que la reemplaza donde difiera.

- Interés visible: `saldo × ((1 + TEM)^(accrualDays / 30) - 1)`.
- Fondo visible: `saldo × 0.0009309 × coverageMonths`.
- La cuota se resuelve con fechas nominales y un fondo interno multiplicado
  por `1.18`. Este factor es una calibración de ingeniería inversa, no se
  identifica ni se presenta como IGV.
- El cronograma visible usa fechas efectivas y días reales. La estructura
  separa `nominalDueDate`, `effectiveDueDate`, `accrualDate` y `accrualDays`
  para incorporar una fuente de devengo interna futura sin hacks.

El nuevo caso Hogar sí obtiene cuota programada S/1192 y fondo inicial
S/33.51. No coincide al 100% con la referencia porque esta iteración no
inventa días internos: la primera fila usa 39 días efectivos y produce
interés S/894.22 (referencia S/893.47). Además, la fila 17 de la referencia
muestra 03/09/2026 aunque el día contractual 2 cae en miércoles hábil; la
regla general produce 02/09/2026. No se añadió una excepción sin evidencia
de un feriado aplicable o una regla contractual distinta.

Métricas reproducibles con `npx vite-node scripts/report-financial-accuracy.ts`:

| Cronograma | Filas exactas | Celdas exactas | Error abs. | Máx. diferencia | Δ capital | Δ interés | Δ fondo | Δ total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Educativo 5,000 | 2/12 | 25/48 | 1.24 | 0.25 | 0.00 | +0.25 | 0.00 | +0.25 |
| Campaña 800 | 0/1 | 2/4 | 0.02 | 0.01 | 0.00 | +0.01 | 0.00 | +0.01 |
| ADRAWASH 10,000 | 3/18 | 37/72 | 1.10 | 0.14 | 0.00 | +0.13 | 0.00 | +0.13 |
| Hogar 10,000 | 1/12 | 21/48 | 1.30 | 0.30 | 0.00 | +0.30 | 0.00 | +0.30 |
| Hogar 18,000 | 0/24 | 42/96 | 127.94 | 20.94 | 0.00 | -2.34 | -0.02 | -2.36 |
| Complementario 7,000 | 1/8 | 16/32 | 0.48 | 0.07 | 0.00 | +0.06 | 0.00 | +0.06 |

Los cuatro cronogramas `GROUP_28` (incluido S/3,500 a 6 cuotas) coinciden en
100% de filas y celdas, con error absoluto y diferencias de totales iguales a
cero.

**Resultado honesto: no se identificó una fórmula que reproduzca las 51
cuotas al céntimo.** Se documenta abajo qué se probó, qué se descartó con
evidencia, cuál es la mejor fórmula defendible, y qué haría falta para
resolver la ambigüedad restante.

## 1. Lo que quedó completamente resuelto

### 1.1 Fechas — 100% resuelto

Las 51 fechas de vencimiento se reproducen exactamente con una regla simple
y separada de la matemática financiera (`src/utils/peruBusinessCalendar.ts`):

1. Cada cuota tiene una **fecha nominal**: mismo día del mes que
   `nominalPaymentDay`, avanzando un mes calendario por cuota desde la
   primera cuota (clampando al último día del mes si el mes destino es más
   corto).
2. La **fecha efectiva** (la que se muestra y la que se usa para calcular
   días transcurridos) es la fecha nominal avanzada al siguiente día hábil
   si cae en fin de semana o feriado.
3. La cuota siguiente vuelve a calcularse desde el día nominal original, no
   desde la fecha movida — así es como Educativo va de 02/01 (día nominal
   2) a 02/02, y no a 06/02.

Calendario usado: sábados, domingos, feriados nacionales fijos, y Jueves/
Viernes Santo (móviles, calculados con el algoritmo de Gauss para el domingo
de Pascua). Con este calendario, **las 51 fechas y los 8 corrimientos
explícitos del prompt coinciden exactamente** (verificado en
`src/tests/dates.test.ts`).

### 1.2 Cuota fija — resuelto para efectos de esta investigación

La cuota fija observada por cronograma (542 / 824.65 / 741 / 1027 / 1055)
es estable en todas las filas salvo la última, que liquida el saldo. Esto
permitió aislar la investigación de interés/fondo sin necesitar resolver
además la derivación de la cuota — un eje ortogonal que no bloquea la
identificación de la fórmula de interés (ver sección 4).

### 1.3 Fondo de cobertura — resuelto en su regla, no en su exactitud

`fondo = saldo_actual × 0.09309% × meses_nominales_cruzados`, redondeado a
2 decimales. `meses_nominales_cruzados` cuenta cuántas fronteras de mes
calendario separan la fecha anterior de la fecha efectiva actual (mínimo 1).
Esto explica por qué Educativo cuota 1 (27/11 → 02/01, cruza diciembre y
enero) usa factor 2 mientras que ADRAWASH cuota 1 (05/05 → 10/06, también 36
días pero cruza solo una frontera) usa factor 1.

En aislamiento (con saldo exacto conocido), esta regla acierta razonablemente
bien; en el motor completo sus fallas son consecuencia directa de que el
`saldo_actual` que recibe está corrompido por el error de interés de filas
anteriores (ver sección 3), no de un error en la regla del fondo en sí.

## 2. Lo que NO se resolvió: la fracción de interés por día

Esta es la única incógnita real. El interés es a rebatir (saldo decreciente)
y depende de una función `f(tasaMensual, díasEfectivos) → tasaDelPeriodo`.

### 2.1 Evidencia decisiva que localiza el problema

Aislando el saldo (usando el capital *reportado* en la fila, no el
calculado, para que los errores no se acumulen entre filas) y agrupando el
residuo `predicho − real` por número de días del periodo:

| días | n  | residuo medio |
|------|----|---------------|
| 28   | 6  | −0.035 |
| 29   | 5  | −0.014 |
| **30** | **14** | **≈ 0** |
| 31   | 13 | +0.011 |
| 32   | 7  | +0.022 |
| 33   | 3  | +0.050 |
| 36   | 2  | +0.140 |

con la fórmula candidata más simple, `interest = balance × ((1+r)^(d/30) − 1)`.

El residuo es cero exactamente en d=30 (donde no hay fracción que
interpolar) y crece monótonamente con `|d−30|`. Esto confirma que el ancla
(un mes = 30 días, tasa a rebatir compuesta) es correcta, y que el error
completo vive en **cómo se interpola la fracción de días sobrante**.

### 2.2 Hipótesis probadas y descartadas (con evidencia)

Todas evaluadas con el harness (`scripts/reverse-engineer-monthly.ts`,
864 modelos candidatos combinando función de tasa × regla de fondo ×
política de redondeo × precisión de saldo):

| Hipótesis | Resultado | Por qué se descarta |
|---|---|---|
| `(1+r)^(d/30) − 1` (compuesto, base 30) | 12/51 interés exacto, 55/153 celdas | Correcto en d=30, sesgo sistemático fuera de eso |
| `r·d/30` (simple, base 30) | peor que compuesto | Sub-estima consistentemente en d>30 |
| Tasa diaria `(1+r)^(1/30)−1` compuesta día a día | idéntico al compuesto d/30 (matemáticamente equivalente) | Mismo resultado |
| Tasa diaria simple `r/30` compuesta día a día | peor | — |
| Bases de días 360/365, TEA→TNA, TEA→diaria 360/365 | todas peores que base 30 | La base 30 es la que minimiza el error, ninguna otra calza |
| Redondeo de la tasa de periodo a 4–12 decimales (HALF_UP y truncado) | máximo 13/51 interés exacto (precisión 7) | Mejora marginal, no cierra la brecha |
| Redondeo de la tasa diaria a 6–12 decimales antes de componer | máximo 13/51 | Igual, no resuelve el patrón por días |
| Saldo interno sin redondear vs. redondeado a 2 decimales | **idéntico** en ambos casos (41.2% vs 41.2% en el modelo interp) | El error no es arrastre de precisión: no se acumula, aparece y desaparece por fila según los días de esa fila específica |
| División por meses calendario reales + resto en días (`(1+r)^m · (1+r·resto/30)`) | peor | Los residuos con d=30 puro (mismos días, distinto reparto meses/resto) demuestran que el mes calendario no es la unidad relevante |
| Base de días = días del mes calendario de inicio/fin/promedio | 0–7/51 | Mucho peor que base fija 30 |
| Fecha nominal (en vez de efectiva) para contar días de interés | errores de S/5–20 por fila | Los feriados NO afectan el devengo, solo la fecha mostrada (ver 1.1) |
| Interpolación lineal `w·compuesto + (1−w)·simple`, barrido w∈[0,1] | mínimo error en w≈0.85–0.90 (mae≈0.0078–0.0113), pero sin w exacto que dé 0 | Mejora el conteo bruto (64/153) pero es un ajuste numérico sin justificación de negocio — el "mejor w" no es una constante redonda ni se explica por ningún concepto financiero identificado, y **empeora** las filas de d=30 que antes eran exactas. Es sobreajuste a los 51 puntos, exactamente lo que el mandato pide evitar. |
| Conteo de días off-by-one (d+1, d−1) | mucho peor (mae > 5) | Descartado de inmediato |

### 2.3 Por qué no se sobreajusta con `interp_w0.9`

El harness encontró que un blend fijo `0.9·compuesto + 0.1·simple` sube el
conteo bruto de celdas exactas de 55/153 a 64/153. Se decidió **no** usar
esa constante en el motor de producción: no tiene ninguna interpretación de
negocio (no es una tasa nominal, no es un factor de comisión conocido, no
aparece en ninguna muestra), sólo minimiza el error cuadrático sobre estos
51 puntos concretos — es decir, es un ajuste a los propios fixtures, lo que
el mandato prohíbe explícitamente ("no hardcodear cuotas esperadas", "no
usar offsets de céntimos"). Un coeficiente de interpolación sin fundamento
es un offset de céntimos disfrazado de fórmula.

## 3. Modelo elegido para producción

`interestRate(monthlyRate, days) = (1 + monthlyRate) ** (days / 30) − 1`

Es la fórmula de interés a rebatir con base de 30 días por mes, la
convención más simple, auditable y estándar para crédito de consumo en
soles. Se ancla exactamente en el caso más común del dataset (d=30, 14/51
filas, 27% de los casos) y su error fuera de esa ancla es acotado
(máximo observado ≈ S/0.29 en un periodo de 36 días).

Se prefiere sobre el blend `interp_w0.9` porque:
- es una fórmula real con significado financiero, no un coeficiente ajustado;
- no degrada las filas donde sí hay certeza (d=30);
- es la que un auditor esperaría ver en un motor de crédito peruano.

## 4. Brecha restante y qué la resolvería

Con la fórmula elegida, el motor **no reproduce las 51 cuotas al céntimo**.
El test `monthlyCalculator.reference.test.ts` lo refleja explícitamente:
compara capital/interés/fondo/total celda por celda contra las fixtures y
documenta cuáles filas fallan y por cuánto, en vez de relajar la aserción o
maquillar el resultado.

Hipótesis que siguen siendo indistinguibles con los datos actuales:
- Un ajuste de tasa (spread) aplicado de forma no lineal según el monto o el
  producto — los datos no permiten separar "efecto del producto" de "efecto
  de los días" porque cada producto del dataset solo aparece con una tasa
  fija.
- Un componente de comisión o cargo administrativo variable que se suma al
  interés puro y que escala con la duración del periodo — no distinguible
  del ruido de interpolación con solo 51 filas concentradas en 5 tasas.
- Un motor de cuota (annuity) que recalcula la cuota fija con una fórmula
  distinta a la observada, cuyo redondeo hacia arriba/abajo en centavos se
  reparte de forma diferente entre capital e interés en cada fila — esto
  cambiaría qué parte del residuo se le atribuye a "interés" vs "capital"
  sin cambiar el total de la cuota.

**Qué diferenciaría estas hipótesis:** un cronograma de referencia adicional
para el **mismo producto y la misma tasa**, pero con **desembolso y primera
cuota elegidos para que todas las cuotas caigan exactamente en periodos de
30 días** (evitando feriados y meses de 28/31 días). Si ese cronograma
reproduce el 100% con `(1+r)^(d/30)-1`, confirma que el problema es
puramente de interpolación de días y acota la búsqueda a esa familia. Si
falla incluso en d=30 puro, indica un factor adicional (comisión, spread)
que la investigación actual no puede aislar de los datos disponibles.

### 4.1 Nota sobre la derivación de la cuota fija

El motor implementado deriva la cuota fija por búsqueda binaria (igual
técnica que GROUP_28): encuentra el pago constante que amortiza el monto
usando la misma fórmula de interés y fondo del cronograma, y redondea hacia
arriba al sol entero (`Math.ceil`). Para 4 de los 5 casos de referencia esto
reproduce exactamente la cuota observada (542, 741, 1055, y el caso de una
sola cuota de Campaña). Para **Mejorando Mi Hogar** el pago teórico
calculado es S/1,025.43, que redondea a S/1,026 — un sol menos que la cuota
real observada (S/1,027). Esto confirma que la brecha de interés de la
sección 2 también se propaga a la derivación de la cuota (un pago teórico
calculado con la fórmula "verdadera" sería ligeramente mayor), y que no hay
una regla adicional de redondeo de cuota independiente que lo explique — es
consistente con, no adicional a, la brecha ya documentada.

## 5. Métricas resumidas

Motor `calculateMonthlySchedule` completo (`src/domain/engines/monthlyCalculator.ts`),
contra las 51 filas reales:

| | Capital | Interés | Fondo | Total (exacto) |
|---|---|---|---|---|
| Filas exactas | 8/51 (15.7%) | 10/51 (19.6%) | 32/51 (62.7%) | 35/51 (68.6%) |

Todas las fechas (51/51) y todos los pagos fijos (4/5 cronogramas, ver 4.1)
coinciden. El desglose por producto y por número de días está disponible
ejecutando `npx tsx scripts/reverse-engineer-monthly.ts`.

Mejor combinación bruta encontrada por el harness sobre las 864 evaluadas:
`interp_w0.9 | balance_x_rate_x_nominalMonths | HALF_UP` con 64/153 celdas
(41.8%) — descartada por sobreajuste (ver 2.3). El modelo elegido para
producción (`compound_d30`) obtiene 55/153 (35.9%) en esa misma métrica
agregada del harness, un poco menos en bruto, pero es la única opción
evaluada que corresponde a una fórmula financiera real y no a un
coeficiente ajustado a estos 51 puntos.
