# FinPilot — Changelog

> Registro cronológico de cambios relevantes del proyecto y su documentación.
> Formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/).
> Versionado semántico. `SCHEMA_VERSION` de la base de datos se anota aquí en cada cambio.

## [Unreleased]

### Fixed — Auditoría de consistencia de cálculos · 2026-07-14

Revisión de la lógica interna tras detectar cifras que no cuadraban entre pantallas. Siete
correcciones, todas con test:

- **Un gasto con tarjeta no generaba deuda si se registraba desde «Gastos».** El vínculo
  `PaymentMethodRow.creditCardId` existía en el esquema pero nadie lo usaba: solo el
  `ConsumoDialog` del detalle de tarjeta marcaba `creditCardId`. Ahora `createTransaction`
  **deriva la tarjeta del método de pago**, y hay UI para gestionar métodos de pago
  (`PaymentMethodsCard` en Configuración) y vincularlos a una tarjeta. El mismo gasto ya cuenta
  igual se registre donde se registre.
- **No se podía desvincular la tarjeta ni el método al editar** (los campos `undefined` se
  omitían del patch). `transactionUpdateSchema` acepta ahora `null` explícito y el servicio borra
  la clave; pasar un gasto de tarjeta a efectivo elimina su deuda. Mismo arreglo en
  `updatePaymentMethod`.
- **La deuda del dashboard no coincidía con la suma de las tarjetas**: el dashboard agregaba
  consumos y pagos en bloque con un único `max(…,0)` y el listado clampaba por tarjeta y excluía
  archivadas. Nueva fuente de verdad única `cardBalancesQuery()` (clamp por tarjeta, incluye
  archivadas con saldo) que consumen dashboard, listado e insights.
- **El día de corte/pago se truncaba al 28** (`Math.min(day, 28)` en `metrics.service` y en
  `PaymentsCalendar`). Ahora se ancla al último día real del mes: una tarjeta que paga el 30
  muestra el 30.
- **El gasto medio del fondo de emergencia incluía el mes en curso** (parcial), hundiendo el
  promedio a principios de mes e inflando la cobertura. Se promedian los últimos N meses
  **completos**; si no hay historia, se prorratea el mes en curso por días transcurridos.
- **El ritmo de ahorro de las metas se promediaba desde el primer aporte**, así que un aporte
  antiguo y aislado seguía contando como ritmo durante años. Ahora usa una **ventana móvil de 6
  meses**.
- **`spendingTrendRule` exigía 2 puntos pero indexaba 3**: con solo dos meses de datos se caía en
  silencio. Guard corregido a 3.

`SCHEMA_VERSION` sin cambios (los datos existentes siguen siendo válidos; los consumos ya
registrados conservan su `creditCardId`).

### Fixed — Patrimonio: consumo de tarjeta contado dos veces · 2026-07-05

- El patrimonio restaba los consumos con tarjeta **dos veces**: una como gasto (dentro de
  `available`) y otra como deuda (`cardDebt`). Un consumo de $270 sin pagar bajaba el patrimonio
  $540 en lugar de $270.
- Corregido en `metrics.service`: el **dinero disponible** ya no descuenta los consumos con
  tarjeta (no salen de caja hasta pagarlos); sí descuenta los pagos de tarjeta. Así
  `patrimonio = ingresos − gastos totales` y pagar la tarjeta no lo altera. Mismo arreglo en
  `netWorthSeriesQuery` (evolución del patrimonio).
- Cubierto con test (`metrics.service.test.ts`): consumo $300 sin pagar → disponible $800,
  deuda $300, patrimonio $500; tras pagar → disponible $500, deuda $0, patrimonio $500 (sin
  cambio). Verificado end-to-end en navegador (ingreso $1.000, gasto $200, tarjeta $270 →
  patrimonio $530, disponible $800).

### Fixed — Borrado de tarjetas de crédito · 2026-07-05

- `deleteCreditCard` fallaba con *"KeyPath creditCardId on object store paymentMethods is not
  indexed"*: al desvincular los métodos de pago usaba `db.paymentMethods.where('creditCardId')`,
  pero ese campo **no es un índice** de `paymentMethods` (índices: `id, type, isArchived`), por lo
  que Dexie lanzaba el error en cada intento de borrado. Se reemplaza por un `.filter()` en memoria
  (la tabla es diminuta), evitando una migración de esquema. Bug preexistente (previo a las
  Fases 8–12). Cubierto con `services/creditCards.service.test.ts` (2 tests: desvincula y borra sin
  historial; bloquea con historial). Verificado end-to-end en navegador.

### Added — Calidad final: cobertura de tests (Fase 12) · 2026-07-05

**Infraestructura de pruebas**
- `src/test/setup.ts` con `fake-indexeddb/auto` (registrado en `vitest.config` como `setupFiles`)
  para ejercitar Dexie y los servicios en el entorno `node`. Helper `src/test/seed.ts` (reset +
  siembra de settings y categorías, e inserción de metas, aportes y presupuestos).

**Nuevos tests (de 39 a 61)**
- `lib/calc/projection` (5): punto inicial, longitud, acumulación sin/ con rendimiento, monotonía.
- `lib/format` (6): moneda, decimales, signo, porcentaje, número y notación compacta.
- `services/metrics.service` (7, con `fake-indexeddb` y `Date` falseado): `dashboardMetricsQuery`
  (KPIs y deuda de tarjeta), `categoryBreakdownQuery`, `monthlyTrendQuery`, `goalsProgressQuery`,
  `budgetStatusQuery` y `emergencyFundStatusQuery`.
- `services/categories.service` (4): reasignación de movimientos al eliminar, bloqueo sin
  reemplazo, protección de categorías del sistema y borrado limpio de categorías vacías.

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0) · `test` ✅ (61/61) · `build` ✅ (PWA).
- Nota: los tests con `fake-indexeddb` falsean **solo `Date`** (no `setTimeout`/`setImmediate`,
  de los que depende internamente fake-indexeddb) para no colgar a Dexie.

Con esta fase se completan **todas las fases del roadmap (0–12)**.

### Added — Configuración editable + pulido (Fase 11 · F12, F13) · 2026-07-05

**Preferencias editables (`GeneralSettingsCard`)**
- Formulario para moneda, idioma/formato (`es`/`en`), inicio de mes (1–28), meta de ahorro
  mensual, objetivos del fondo de emergencia (meses) y respaldo automático (frecuencia/retención),
  con detección de cambios y guardado.
- Validación centralizada: `updateSettings` ahora valida el patch con `settingsUpdateSchema`
  (Zod) antes de escribir, conservando los tipos branded (`Cents`) del patch original.

**Gestión de categorías (`CategoriesCard`)**
- Crear/editar/archivar/restaurar/eliminar categorías por tipo (gastos/ingresos). Al eliminar una
  categoría con movimientos, `DeleteCategoryDialog` exige **reasignarlos** a otra del mismo tipo
  (integridad referencial); las de sistema solo se archivan.
- `CategoryFormDialog` (nombre, color, icono) y set de iconos propio `settings/lib/categoryIcons`
  (incluye los de las categorías semilla, con fallback). Hook `useAllCategories`.
- `SettingsPage` recompuesta: preferencias + categorías + datos/respaldos; tema por el toggle.

**Notas PWA / accesibilidad (ya existentes, verificadas)**
- Prompt de actualización del service worker (`pwa.ts`), manifest e iconos completos y
  `prefers-reduced-motion` respetado en `globals.css`.

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0) · `test` ✅ (39/39) · `build` ✅ (PWA).
- End-to-end en navegador: editar "Inicio de mes" → 15 y guardar (persistido en IndexedDB,
  resto de campos intactos); crear categoría "Suscripciones" (no-sistema) y eliminarla vía el
  diálogo (detecta "sin movimientos" → borrado permanente). Sin errores de consola tras recarga.

### Added — Exportación y respaldos (Fase 10 · F11) · 2026-07-05

**Exportación (`export.service.ts`, carga diferida)**
- `exportTransactionsXlsx`: libro Excel (SheetJS) con hoja **Resumen** (moneda, totales, balance)
  y hoja **Movimientos** (fecha, tipo, categoría, método, descripción, monto numérico, etiquetas).
- `exportReportPdf`: informe PDF (jsPDF + jspdf-autotable) con KPIs, tabla de metas y de tarjetas.
- `xlsx`, `jspdf` y `jspdf-autotable` se importan de forma diferida (`import()`), por lo que
  quedan en chunks aparte y no engordan el bundle principal.

**Respaldo / restauración (`backups.service.ts`, `backup.schema.ts`)**
- `exportBackupFile` (descarga JSON legible), `downloadStoredBackup` (descarga un respaldo local)
  e `importBackupFile`: valida con Zod (`backupFileSchema`) y **restaura de forma atómica**
  (una transacción Dexie: limpia y repuebla las 14 tablas de datos; no toca adjuntos ni backups).
- `createLocalBackup`/`buildBackupEnvelope` refactorizados para compartir la envoltura.

**Auto-respaldo (`autoBackup.service.ts`)**
- `maybeRunAutoBackup` en el arranque (`main.tsx`): crea un respaldo local si está activo y venció
  el intervalo, respetando la retención. No bloquea ni propaga errores.

**UI (Configuración)**
- `DataBackupCard`: exportar Excel/PDF, descargar/restaurar respaldo (con confirmación destructiva),
  toggle de respaldo automático y lista de respaldos locales (crear, descargar, eliminar).
  Hook `useBackups`. Helper `lib/download.ts` (`downloadBlob`, `fileDateStamp`).

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0) · `test` ✅ (39/39, +6 del esquema de respaldo) · `build` ✅
  (xlsx/jspdf en chunks separados; el bundle principal apenas cambia).
- End-to-end en navegador: auto-respaldo creado al arrancar; export Excel y PDF sin errores;
  **round-trip de respaldo** (inyección de archivo → validación → restauración atómica →
  `transactions` queda exactamente con el registro del archivo). Sin errores de consola.

### Added — Inteligencia financiera (Fase 9 · F10b) · 2026-07-05

**Motor de insights (`lib/insights/`)**
- Patrón Strategy: `types.ts` (`Insight`, `InsightContext`, severidad y rango), `engine.ts`
  (`runInsights`, función pura que ejecuta las reglas y ordena por severidad) y una regla por
  familia en `rules/`: `spendingTrend` (comparativa mes a mes), `categoryOpportunity`
  (optimización de la mayor categoría), `savingCapacity` (cuánto más ahorrar), `emergencyFund`
  (cobertura), `cardUtilization` (uso del cupo) y `goalsMomentum` (metas + "vas por buen camino").
- `insights.service.ts` arma el contexto con los agregados reales (`dashboardMetricsQuery`,
  `monthlyTrendQuery`, `categoryBreakdownQuery`, `goalsProgressQuery`, `cardsSummaryQuery`,
  `emergencyFundStatusQuery`) y ejecuta el motor. Hook `useInsights` (reactivo).

**UI**
- `InsightsPage` (grid de tarjetas con estado vacío) e `InsightCard` (icono/color/orden por
  severidad y chip de familia).

**Fixed**
- Gráficos (`AreaChart`, `BarTrendChart`, `ComparisonBarChart`, `ScenarioLineChart`): el callback
  del eje Y hacía `asCents(Number(value))`, que reventaba cuando Chart.js genera ticks
  fraccionarios (p. ej. `0.5` con series todas en cero). Se redondea el tick antes de formatear.

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0) · `test` ✅ (33/33, +6) · `build` ✅ (PWA).
- End-to-end en navegador con datos reales sembrados: las 6 familias con cifras exactas
  ("Gastaste un 39 % más en jun" $250 vs $180; gasto medio $286,67 → $860,01 para 3 meses;
  «Entretenimiento» 58 % → liberar $50/mes hacia «Carro» (faltan $400); meta al 80 %; supera
  meta de ahorro (sobran $270); "Vas por buen camino" 57 %), ordenadas por severidad. Sin errores
  de consola tras el fix de gráficos.

### Added — Simulador y proyecciones (Fase 8 · F09, F10) · 2026-07-05

**Cálculo (`lib/calc/interest.ts`)**
- `simulateDeposit` (monto final, intereses, rentabilidad total y tasa efectiva anual/APY),
  `depositSchedule` (curva de crecimiento mes a mes) y `periodsPerYear` según periodicidad.
  Fórmulas: capitalización periódica `A = P(1 + r/n)^(n·t)` y a vencimiento (interés simple)
  `A = P(1 + r·t)`. Funciones puras con **9 casos de test**.

**Pólizas (F09) — `features/deposits`**
- `DepositSimulator`: simulador interactivo (capital, tasa anual, plazo en meses, capitalización)
  con resultados en vivo (monto final, intereses, rentabilidad, APY) y gráfico de crecimiento.
- `DepositFormDialog` (guardar/editar escenarios, reutilizable desde el simulador) y
  `ScenarioComparison` (tabla comparativa + `ComparisonBarChart` de monto final, badge "Mejor",
  editar/eliminar). Hook `useDeposits`. `DepositsPage` reescrita (simulador + escenarios).

**Proyecciones (F10) — `features/projections`**
- `ProjectionsPage`: patrimonio a 1/3/5/10/15/20 años en tres escenarios (conservador 3 %,
  base 5 %, agresivo 8 %) con patrimonio inicial y ahorro mensual ajustables, `ScenarioLineChart`
  multi-línea, tabla por horizonte y nota de supuestos. Hook `useProjectionInputs` (prellena
  patrimonio actual y ahorro sugerido desde `dashboardMetricsQuery`). Reusa `projectSavings`.
- Nuevo gráfico genérico `components/charts/ComparisonBarChart` (barras con color por barra).

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0) · `test` ✅ (27/27, +9) · `build` ✅ (PWA).
- End-to-end en navegador: simulador $5.000 al 12 % mensual/12 m → monto final $5.634,13,
  interés $634,13, APY 12,68 %; dos escenarios guardados con tabla y gráfico comparativos.
  Proyecciones $300/mes → conservador 20 a $98.490,60 / base $123.310,10 / agresivo $176.706,12.
  Sin errores de consola.

### Added — Fondo de emergencia (F06) · 2026-07-03

- `emergencyFundStatusQuery` ampliado: además de cobertura en meses y gasto medio, devuelve
  los **hitos** (3/6/12 meses, configurables en `settings`) con objetivo, faltante, % y estado,
  y el objetivo recomendado.
- `EmergencyFundPage`: estado inicial con **objetivos estimados** según el gasto medio y botón
  para crear el fondo (`EmergencyFundSetupDialog`, crea la meta `isEmergencyFund` y la enlaza en
  settings); vista de cobertura (meses cubiertos, ahorrado, gasto medio, progreso), **hitos
  3/6/12**, aportes por mes e historial. Acciones: asignar dinero y editar objetivo (reutiliza
  los diálogos de metas). Hook `useEmergencyFund`.

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0) · `test` ✅ (18/18) · `build` ✅ (PWA).
- End-to-end en navegador: gasto medio $300/mes → objetivos 3m $900 / 6m $1.800 / 12m $3.600;
  tras crear el fondo y aportar $750 → **cobertura 2.5 meses**, progreso 42% hacia 6 meses,
  hito 3 m 83% (faltan $150). Sin errores de consola.

### Added — Módulo de Estadísticas (Fase 7) · 2026-07-03

**Agregaciones (`metrics.service.ts`)**
- `yearlyTotalsQuery` (comparación anual), `monthlyTotalsForYearQuery` (12 meses de un año),
  `categoryBreakdownYearQuery` y `paymentMethodBreakdownYearQuery` (por año y tipo),
  `netWorthSeriesQuery` (evolución del patrimonio, coherente con el dashboard). Paleta
  `CHART_PALETTE`.
- `lib/calc/projection.ts`: `projectSavings` (interés compuesto con aportes mensuales, F10).

**UI interactiva (`StatisticsPage`, 8 pestañas)**
- Resumen (KPIs + evolución del patrimonio), Mensual (año navegable), Anual (comparación +
  tabla), Categorías y Métodos (año + toggle ingresos/gastos), Metas (ahorro por meta +
  progreso), Tarjetas (deuda + utilización), Proyecciones (slider de ahorro + tasa +
  horizontes 1/3/5/10/15/20 años).
- Componentes: `AreaChart` (línea/área genérica; Chart.js line), `BreakdownPanel` (dona +
  lista reutilizable), `ProjectionsPanel` (interactivo). Reúso de `BarTrendChart`/`DonutChart`.
- Hooks `useStatistics` (8 hooks reactivos).

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0) · `test` ✅ (18/18) · `build` ✅ (PWA).
- End-to-end con datos multi-mes/año: patrimonio $2.164,50 y su evolución; comparación anual
  (2026 balance +$1.964,50); métodos (Sin método 54% / Efectivo 32% / Transferencia 14%);
  proyecciones interactivas (slider $1.000/mes → 20 años $416.905,18); metas y tarjetas.
  Sin errores de consola.

### Added — Módulo de Metas financieras (Fase 5) · 2026-07-03

**Agregaciones (`metrics.service.ts`)**
- `goalDetailQuery`: ahorro, restante, %, ritmo de ahorro mensual, meses para lograr, fecha
  estimada de cumplimiento, aporte necesario para la fecha objetivo y si va al día.
- `goalMonthlyContribQuery` (aportes por mes) y `goalProjectionQuery` (serie de ahorro
  acumulado real + proyección hacia el objetivo).

**UI**
- `GoalsPage`: resumen (ahorrado/objetivo/nº metas), tarjetas de meta (`GoalCard`) con icono,
  progreso, badge "Lograda" y acción rápida "Asignar dinero"; estado vacío.
- `GoalDetailPage` (`/goals/:id`, ruta nueva): donut de progreso, KPIs (falta, ritmo, fecha
  estimada, necesario/mes), **gráfico de proyección** (línea real + proyección + objetivo,
  `GoalProjectionChart`), **aportes por mes** (`GoalContributionsChart`) e **historial**
  (`ContributionsList`, con borrado). Acciones: asignar dinero (`ContributionDialog`, aporte/
  retiro), editar (`GoalFormDialog`), eliminar (cascada).
- `GoalFormDialog`: nombre, objetivo, fecha límite, prioridad, icono, color, marca de fondo de
  emergencia. Iconos en `features/goals/lib/icons.ts`.
- Hooks `useGoals`, `useGoalDetail`, `useGoalContributions`, `useGoalMonthly`,
  `useGoalProjection`. Chart.js: registrados `LineElement`/`PointElement`/`Filler`.

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0) · `test` ✅ (18/18) · `build` ✅ (PWA).
- End-to-end en navegador: meta Carro (ahorro $1.200/15%, ritmo $400/mes, 17 meses, fecha
  estimada dic-2027, necesario $340/mes, "vas al día"); meta Celular "Lograda" 100%; donut,
  proyección (línea + objetivo), aportes por mes e historial. Reactivo. Sin errores de consola.

### Added — Módulo de Tarjetas de crédito (Fase 4) · 2026-07-02

**Modelo**
- Consumos = gastos (`transactions`) con `creditCardId`; pagos = `creditCardPayments`. Deuda
  actual = consumos − pagos. `metrics.service` reescrito para este modelo (coherente en
  dashboard y módulo): `cardsSummaryQuery`, `cardDetailQuery`, `cardHistoryQuery`,
  `cardMovementsQuery`; `dashboardMetricsQuery.cardDebt` alineado.

**UI**
- `CreditCardsPage`: resumen (deuda/cupo/utilización global), alertas (`CardAlerts`), tarjetas
  visuales (`CreditCardVisual`, estilo tarjeta física con degradado) y **calendario de pagos**
  (`PaymentsCalendar`, marca cortes y fechas de pago del mes).
- `CardDetailPage` (`/cards/:id`, ruta nueva): tarjeta visual, KPIs (disponible, utilización,
  próximo pago/corte, consumo/pagos del mes), **gráfico consumos vs pagos** (`CardConsumptionChart`),
  **movimientos** (`CardMovementsList`) e **historial mensual**. Acciones: registrar consumo
  (`ConsumoDialog`), registrar pago (`PaymentDialog`, sugiere el total), crear **recordatorio**
  de pago, editar (`CardFormDialog`), archivar y eliminar.
- Hooks `useCreditCards`, `useCardDetail`, `useCardHistory`, `useCardMovements`,
  `usePendingReminders`.

**Fix**
- `createCardPayment` leía `db.creditCards` fuera del alcance de su transacción Dexie
  (DexieError); se añadió la tabla al scope. Bug de la Fase 2 detectado al ejercitar el flujo.

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0) · `test` ✅ (18/18) · `build` ✅ (PWA).
- End-to-end en navegador: 2 tarjetas, consumos y pago reales → deuda $930,17, disponible
  $2.069,83, utilización 31%, alertas (78% cupo, vence en 3 días); detalle con KPIs, gráfico,
  movimientos (consumos +/pago −) e historial mensual. Reactivo. Sin errores de consola.

### Added — Módulo de Ingresos/Gastos ampliado + Presupuestos · 2026-07-02

**Movimientos (Ingresos/Gastos)**
- Vista con 3 modos en `TransactionsView`: **Lista**, **Calendario** y **Estadísticas** (Tabs).
- **Filtros** avanzados (`TransactionFilters`): por categoría, método de pago y etiqueta, con
  contador y limpieza. Nuevo filtro `tag` en `transactions.service`.
- **Calendario** mensual (`TransactionCalendar`): total diario por día, selección de día y
  detalle de sus movimientos.
- **Estadísticas** del módulo (`TransactionStats`): dona por categoría, top categorías con
  barras, promedio diario y categoría principal. `categoryBreakdownQuery` admite tipo.
- (Ya existían de Fase 2: crear, editar, eliminar, buscar, categorizar, adjuntar imágenes.)

**Presupuestos (F07)**
- Agregación `budgetStatusQuery` en `metrics.service`: gastado, disponible, **proyección a fin
  de mes** y alertas (excedido / en riesgo), derivado de los gastos reales.
- `BudgetPage` completa: resumen mensual, presupuesto general + por categoría, barras por
  estado, badges, crear/editar/eliminar (`BudgetDialog`, upsert) y navegación por mes.
- Hook `useBudgetOverview`.

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0 problemas) · `test` ✅ (18/18) · `build` ✅ (PWA).
- End-to-end en navegador con datos reales: Lista con filtros, Calendario (totales diarios y
  selección de día), Estadísticas (dona + top categorías), Presupuestos (excedido/en riesgo,
  proyección). Reactivo al limpiar datos. Sin errores de consola.

### Added — Fase 3 (Dashboard) · 2026-07-02

**Métricas derivadas (`services/metrics.service.ts`)**
- Cálculo al vuelo desde IndexedDB (ADR-0007, sin datos simulados): patrimonio, dinero
  disponible, total ahorrado, ingresos/gastos/balance del mes, tasa de ahorro.
- Desglose de gastos por categoría, tendencia de 6 meses, progreso de metas, resumen de
  tarjetas (utilización, días para pagar, estado) y cobertura del fondo de emergencia.

**Gráficos (Chart.js)**
- Registro central en `components/charts/setup.ts`; `DonutChart` (categorías) y `BarTrendChart`
  (ingresos vs gastos). Colores leídos de los design tokens (`lib/theme-colors.ts`), se
  recalculan al cambiar de tema.

**Widgets del Dashboard**
- `FinancialSummary` (rejilla de KPIs), `IndicatorsRow` (indicadores clave), `SpendingDonut`,
  `IncomeExpenseTrend`, `GoalsWidget`, `CardsWidget`, `AlertsWidget` (+ `DashboardSection`
  contenedor, `KpiCard`, `ProgressBar`).
- Motor de alertas derivadas `features/dashboard/lib/alerts.ts` (vencimiento y utilización de
  tarjetas, fondo de emergencia, balance negativo, ritmo de ahorro).
- Hooks reactivos `useDashboard*` (`useLiveQuery`). Navegación por mes reutilizando
  `MonthNavigator`. Esqueletos de carga.

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0 problemas) · `test` ✅ (18/18) · `build` ✅ (PWA).
- End-to-end en navegador con datos reales sembrados: KPIs, dona, barras, metas, tarjeta,
  alertas ("hoy vence tu tarjeta", "vas por buen camino 81%") e indicadores correctos;
  actualización reactiva al limpiar datos. Sin errores de consola.

### Added — Fase 2 (registro de movimientos + capa de datos completa) · 2026-07-02

**Validaciones (Zod)**
- Primitivas reutilizables (`zCents`, `zIsoDate`, `zYearMonth`, enums…) y esquemas de
  create/update para todas las entidades en `src/lib/validation/`.
- `parseOrThrow` centraliza la validación en los servicios → `ValidationError` con la lista
  de problemas. Pruebas de esquemas (7 casos nuevos).

**Servicios CRUD (todas las tablas)**
- `transactions` (núcleo Fase 2): alta/edición/borrado, **quick-add < 5 s**, filtros
  (mes/búsqueda), totales mensuales, sincronización de etiquetas y enlace de comprobantes.
- `categories`, `paymentMethods`, `tags`, `attachments` (Blob + control de cuota).
- `creditCards`, `creditCardStatements`, `creditCardPayments` (recalculan pagado/estado).
- `goals`, `goalContributions` (borrado en cascada, ahorro derivado).
- `budgets` (upsert por mes/categoría), `deposits`, `reminders`, `netWorth`, `backups`.
- **Integridad referencial** en los borrados (bloqueo/reasignación/archivado/cascada).

**Persistencia y migraciones**
- Esquema y `db.on('populate')` movidos a `db/migrations.ts` con el patrón documentado para
  versiones futuras (`SCHEMA_VERSION` sin cambios: 1).
- Helpers: `stripUndefined` (patches con `exactOptionalPropertyTypes`), `lib/currency`,
  `lib/date` (`currentTime`).

**UI de Ingresos y Gastos (F02, F03)**
- Vista compartida `TransactionsView` (mes, resumen, búsqueda, lista, diálogos) usada por
  Ingresos y Gastos. Lista agrupada por fecha con editar/eliminar.
- `TransactionForm` (RHF) con `MoneyInput`, `TagsInput`, selects de categoría/método y
  adjunto de comprobante (gastos). `QuickAddExpenseDialog` global desde la barra superior
  (store Zustand `quickAdd`).
- Nuevas primitivas shadcn: `input`, `label`, `textarea`, `select`, `dialog`, `alert-dialog`,
  `tabs`; `ConfirmDialog` reutilizable.
- Hooks reactivos: `useCategories`, `usePaymentMethods`, `useTransactions`,
  `useMonthlyTotals`, `useTags`, `useDebouncedValue`.

**Verificación**
- `typecheck` ✅ · `lint` ✅ (0 problemas) · `test` ✅ (18/18) · `build` ✅ (PWA).
- End-to-end en navegador: quick-add deriva fecha/hora/mes, etiquetas persistidas, totales
  correctos, listado reactivo (useLiveQuery) y diálogos operativos. Sin errores de consola.

### Added — Fase 0 + Fase 1 (cimientos y núcleo de datos) · 2026-07-02

**Scaffold y configuración**
- Proyecto Vite + React 18 + TypeScript (strict, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`) con `references` (`tsconfig.app`/`tsconfig.node`) y path alias `@/*`.
- Tailwind CSS con tokens de tema (claro/oscuro) por CSS variables; `tailwindcss-animate`.
- shadcn/ui (estilo new-york): `button`, `card`, `dropdown-menu`, `tooltip`, `separator`,
  `sheet`, `sonner`, `skeleton`, `badge`, `scroll-area`.
- ESLint 9 (flat config) + Prettier (+ plugin Tailwind) + Husky + lint-staged.
- PWA con `vite-plugin-pwa` (Workbox `generateSW`, `registerType: 'prompt'`), manifest e
  iconos (192/512/maskable/apple-touch/favicon).

**Núcleo de datos y utilidades**
- Base de datos Dexie `finpilot` con las 16 tablas e índices de `database.md` (`SCHEMA_VERSION = 1`);
  sembrado inicial en `db.on('populate')` (configuración, categorías y métodos de pago).
- Branded types: `Cents`, `IsoDate`/`IsoDateTime`/`YearMonth`, IDs por entidad.
- Utilidades puras: `money` (aritmética en centavos), `format` (Intl), `date` (date-fns),
  `errors` (jerarquía `AppError`), `id` (nanoid). Pruebas de `money` con Vitest (11 casos).
- `services/settings.service` + `SettingsProvider`/`ThemeProvider` (reactivos vía `useLiveQuery`).

**Shell y navegación**
- Layout principal (sidebar de escritorio + panel móvil `Sheet` + topbar), selector de tema,
  error boundary por ruta, splash de carga.
- Router (React Router) con 12 páginas de feature en `lazy` (code-splitting) + 404. Cada
  página es un placeholder funcional que referencia su fase del roadmap.

**Documentación**
- Documentación de arquitectura inicial en `docs/`: `architecture.md`, `database.md`,
  `features.md`, `decisions.md`, `roadmap.md`, `changelog.md`. README completo.

### Verificación
- `typecheck` ✅ · `lint` ✅ (0 problemas) · `test` ✅ (11/11) · `build` ✅ (PWA + code-splitting).
- Arranque verificado: la app carga, temas claro/oscuro funcionan, la base se siembra y la
  página de Configuración lee datos reales desde IndexedDB.

### Notas
- Alias `utils` de shadcn apuntado a `@/lib/cn` (helper `cn`), coherente con la doc.
- `chart.js`/`react-chartjs-2` declarados para fases posteriores (aún no importados).

---

_Convención: al implementar cada fase se añade una entrada con Added/Changed/Fixed/Removed y,
si aplica, el nuevo `SCHEMA_VERSION` y su migración._
