# FinPilot — Catálogo funcional

> Estado: **PROPUESTA — pendiente de aprobación**. Última actualización: 2026-07-02.
> Traduce los requisitos del PDF a features concretas, con reglas de negocio y cálculos.

Cada feature indica: **objetivo**, **datos** (tablas implicadas), **reglas/cálculos** y
**criterios de aceptación**. Los IDs `Fxx` se usan en [`roadmap.md`](./roadmap.md).

---

## F01 · Dashboard (centro de control)
**Objetivo:** vista única del estado financiero del mes en curso.
**Muestra:** patrimonio total, dinero disponible, total ahorrado, gastos del mes, ingresos
del mes, balance mensual, % de ahorro, gráficos, resumen de tarjetas, metas, recordatorios,
indicadores financieros.
**Datos:** `transactions`, `goals`, `goalContributions`, `creditCards`,
`creditCardStatements`, `netWorthSnapshots`, `reminders`.
**Cálculos:** ver [`database.md`](./database.md) §5. Todo derivado y reactivo (`useLiveQuery`).
**Aceptación:** carga < 1 s; cifras cuadran con las secciones detalle; responsive; claro/oscuro.

## F02 · Ingresos
**Objetivo:** registrar, editar y eliminar ingresos.
**Categorías semilla:** Sueldo, Bonificaciones, Ingresos extra, Otros.
**Datos:** `transactions (type='income')`, `categories (type='income')`.
**Reglas:** monto > 0; categoría obligatoria; fecha por defecto = hoy.
**Aceptación:** alta/edición/borrado con confirmación; refleja al instante en dashboard.

## F03 · Gastos (quick-add < 5 s)
**Objetivo:** registrar gastos en menos de cinco segundos y con detalle opcional rico.
**Campos:** fecha, hora, monto, descripción, categoría, método de pago, notas, etiquetas,
foto de comprobante (opcional).
**Categorías semilla:** Transporte, Alimentación, Celular, Tarjeta de crédito, Novia,
Compras, Entretenimiento, Salud, Viajes, Otros (configurables).
**Datos:** `transactions (type='expense')`, `categories`, `paymentMethods`, `tags`,
`attachments`.
**Reglas:** quick-add exige solo monto + categoría; defaults: fecha/hora = ahora, método =
último usado. Adjuntar foto guarda `Blob` en `attachments`.
**Aceptación:** un gasto típico se registra en ≤ 5 s / ≤ 3 toques desde cualquier pantalla.

## F04 · Tarjetas de crédito
**Objetivo:** administrar múltiples tarjetas con alertas y control de cupo.
**Guarda:** banco, cupo, fecha de corte, fecha máxima de pago, pago mínimo, consumo actual,
pagos realizados. **Historial mensual** por corte.
**Datos:** `creditCards`, `creditCardStatements`, `creditCardPayments`, `transactions`.
**Cálculos/Reglas:**
- Utilización = consumo actual / cupo (alerta si > 30 % y > 70 %).
- Días restantes para pagar = `dueDate − hoy` (alerta si ≤ 5 días).
- Consumo actual = Σ gastos con `creditCardId` en el ciclo − pagos.
**Aceptación:** ver días restantes, % de cupo, estado del corte e historial por mes.

## F05 · Metas
**Objetivo:** metas ilimitadas con progreso (Carro, Fondo emergencia, Viaje, PC, Celular, Casa…).
**Cada meta:** nombre, objetivo, fecha, prioridad, ahorro acumulado, %, barra de progreso.
**Datos:** `goals`, `goalContributions`.
**Cálculos:** `savedAmount = Σ contributions`; `% = savedAmount / targetAmount`;
proyección de fecha de cumplimiento según ritmo de aporte (usa `insights`).
**Aceptación:** crear/editar/eliminar; aportar/retirar; barra y % correctos.

## F06 · Fondo de emergencia
**Objetivo:** calcular automáticamente cuántos meses de gastos cubre y cuánto falta para
3, 6 y 12 meses.
**Datos:** meta con `isEmergencyFund=true`, `transactions` (gasto medio).
**Cálculos:** `gastoMedioMensual` (media móvil configurable, p. ej. 3 meses);
`cobertura = saved / gastoMedio`; faltantes para cada umbral.
**Aceptación:** muestra cobertura en meses y objetivos 3/6/12 con faltantes.

## F07 · Presupuesto mensual
**Objetivo:** crear presupuestos por mes (global y/o por categoría) con alertas.
**Muestra:** presupuesto, gastado, disponible, proyección a fin de mes.
**Datos:** `budgets`, `transactions`.
**Cálculos:** `gastado = Σ gastos del mes (por categoría)`;
`proyección = gastado / díasTranscurridos × díasDelMes`; alerta si proyección > presupuesto
o gastado > umbral (p. ej. 80 %).
**Aceptación:** alertas visibles cuando se gasta de más; proyección coherente.

## F08 · Estadísticas
**Objetivo:** gráficos de ingresos, gastos, balance, ahorros, categorías, evolución del
patrimonio, comparación mensual y anual.
**Datos:** `transactions`, `goalContributions`, `netWorthSnapshots`.
**Gráficos (Chart.js):** líneas (evolución), barras (comparativas mensual/anual), dona
(gastos por categoría), área (patrimonio).
**Aceptación:** filtros por rango; datos exportables; rendimiento fluido.

## F09 · Pólizas (simulador de depósitos a plazo)
**Objetivo:** simular depósitos a plazo y comparar escenarios.
**Entrada:** capital, interés, tiempo, periodicidad. **Calcula:** intereses, monto final,
rentabilidad. **Compara** varios escenarios.
**Datos:** `depositScenarios`; cálculo en `lib/calc/interest.ts` + `deposits.service`.
**Fórmula:** interés compuesto `A = P(1 + r/n)^(n·t)` con `n` según periodicidad; a
vencimiento usa interés simple `A = P(1 + r·t)`.
**Aceptación:** resultados exactos (test de fórmulas); tabla comparativa de escenarios.

## F10 · Proyecciones
**Objetivo:** simular patrimonio/ahorro a 1, 3, 5, 10, 15 y 20 años con distintos niveles
de ahorro.
**Datos:** `settings.monthlySavingsTarget`, histórico de ahorro; cálculo en
`projections.service`.
**Cálculos:** acumulación de aportes mensuales con rendimiento opcional (interés compuesto);
escenarios (conservador/base/agresivo).
**Aceptación:** curvas por horizonte y por nivel de ahorro; supuestos visibles.

## F10b · Inteligencia financiera (insights)
**Objetivo:** análisis automático de los datos con mensajes accionables.
**Ejemplos (del PDF):** "gastaste 18 % más que el mes anterior"; "si reduces entretenimiento
20 %, alcanzas el carro dos meses antes"; "puedes ahorrar 45 USD adicionales"; "tu fondo
cubre 1.2 meses"; "usas el 42 % del cupo"; "vas por buen camino".
**Datos:** todo el dominio (lectura).
**Diseño:** patrón **Strategy** — cada regla es `(ctx: InsightContext) => Insight | null`
en `lib/insights/rules/`; `insights.service` construye el contexto (agregados) y ejecuta las
reglas activas, ordenando por severidad/relevancia.
**Aceptación:** al menos las 6 familias de insight del PDF, con cifras reales del usuario.

## F11 · Exportación / Respaldo
**Objetivo:** exportar a Excel y PDF; exportar e importar respaldo completo.
**Datos:** todas las tablas.
**Diseño:** `export.service` (Excel vía SheetJS, PDF vía jsPDF), `backup.service`
(JSON versionado, import validado con Zod). Ver [`database.md`](./database.md) §7.
**Aceptación:** respaldo re-importable sin pérdida; Excel/PDF legibles y correctos.

## F12 · Configuración
**Objetivo:** moneda, categorías, objetivos, modo oscuro, respaldos.
**Datos:** `settings`, `categories`.
**Aceptación:** cambios persistentes e inmediatos (moneda/locale/tema).

## F13 · Diseño y UX (transversal)
Minimalista, colores elegantes, animaciones suaves, claro/oscuro, responsive, experiencia
excelente. Estética "bancaria/inversiones". Ver [`architecture.md`](./architecture.md) §11.

## F14 · Seguridad / alcance
Sin usuarios, sin autenticación, un solo usuario, todo local. (Requisito explícito.)

---

## Reglas de negocio transversales

- **Borrado de categoría con movimientos:** bloquear o reasignar a "Otros" (confirmación).
- **Borrado de tarjeta:** archivar tarjeta y conservar movimientos históricos.
- **Montos:** siempre positivos en UI; el `type`/contexto define el signo.
- **Moneda única** en v1 (la del `settings`); multi-moneda queda para fase futura.
- **Zona horaria:** cálculos de "mes" respetan `startOfMonth` de `settings`.

---

## Datos iniciales del usuario (semilla opcional, de onboarding)

Del PDF, para un arranque útil (no hardcodeado; se ofrece en un asistente inicial):
ingreso fijo 810 USD; disponible 233.62 USD; transporte 3 USD L–V + 13.75 USD viernes;
celular 20.50 USD; consumo tarjeta del mes 250.17 USD; meta de ahorro ≈ 300 USD/mes; metas:
carro y fondo de emergencia. Se cargará mediante el flujo normal de la app, no como valores
fijos en el código.
