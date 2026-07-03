# FinPilot — Changelog

> Registro cronológico de cambios relevantes del proyecto y su documentación.
> Formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/).
> Versionado semántico. `SCHEMA_VERSION` de la base de datos se anota aquí en cada cambio.

## [Unreleased]

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
