# FinPilot — Roadmap de implementación

> Estado: **TODAS LAS FASES COMPLETADAS** (0–12). Última actualización: 2026-07-05.
> Plan por fases ya ejecutado; el avance se refleja marcando casillas y anotando cambios en
> [`changelog.md`](./changelog.md).

Orden pensado para tener valor usable cuanto antes y construir sobre cimientos sólidos
(persistencia y dinero primero, features encima). IDs `Fxx` según [`features.md`](./features.md).

---

## Fase 0 · Cimientos del proyecto — ✅ COMPLETADA (2026-07-02)
- [x] Scaffold Vite + React + TS (strict) + path aliases.
- [x] Tailwind + tokens de tema (claro/oscuro) + shadcn/ui base.
- [x] ESLint + Prettier + husky + lint-staged; scripts npm.
- [x] Estructura de carpetas de [`architecture.md`](./architecture.md) §3.
- [x] PWA (vite-plugin-pwa), iconos, layout principal y navegación.
- **Entregable:** `npm install && npm run dev` levanta el shell con layout, tema y rutas.

## Fase 1 · Núcleo de datos — ✅ COMPLETADA (2026-07-02)
- [x] Dexie: `db.ts`, `schema.ts`, índices, `seed.ts` (categorías/métodos por defecto).
- [x] Tipos base (`Cents`, `IsoDate`, IDs branded).
- [x] `lib/money.ts`, `lib/date.ts`, `lib/format.ts`, `lib/errors.ts`, `lib/id.ts`.
- [x] `services/settings.service` + hook `useSettings` (reactivo vía `useLiveQuery`).
- [x] Pruebas de utilidades monetarias (Vitest, 11 casos).
- **Entregable:** DB inicializada y sembrada; utilidades monetarias con tests. ✔ verificado.
- _Nota:_ los esquemas Zod de escritura y `useCategories` se incorporan en la Fase 2, junto
  al primer flujo de datos que los consume.

## Fase 2 · Registro de movimientos + capa de datos completa (F02, F03) — ✅ COMPLETADA (2026-07-02)
- [x] Ingresos: alta/edición/borrado.
- [x] Gastos: **quick-add < 5 s** + formulario completo (adjuntos, etiquetas, notas).
- [x] Listados con filtros (mes, búsqueda) + totales mensuales; `transactions.service`.
- [x] **Validaciones Zod** para todas las entidades + `parseOrThrow` → `ValidationError`.
- [x] **CRUD de todas las tablas** (categorías, métodos de pago, etiquetas, adjuntos,
      transacciones, tarjetas, cortes, pagos, metas, aportes, presupuestos, depósitos,
      recordatorios, snapshots de patrimonio, respaldos) con integridad referencial.
- [x] **Migraciones** centralizadas en `db/migrations.ts` (patrón documentado para v2+).
- **Entregable:** registrar y ver ingresos/gastos; capa de persistencia lista para producción.
      ✔ verificado end-to-end en navegador.

## Fase 3 · Dashboard (F01) — ✅ COMPLETADA (2026-07-02)
- [x] KPIs derivados (patrimonio, disponible, ahorrado, ingresos, gastos, balance, % ahorro).
- [x] Gráficos Chart.js: dona de gastos por categoría + barras ingresos/gastos (6 meses).
- [x] Widgets de metas (progreso), tarjetas (cupo/utilización/días) y alertas derivadas.
- [x] Indicadores (tasa de ahorro, cobertura fondo de emergencia, utilización de tarjetas).
- [x] `services/metrics.service` + hooks `useDashboard*` (todo reactivo vía `useLiveQuery`).
- **Entregable:** centro de control con cifras reales. ✔ verificado end-to-end (sin datos simulados).

## Fase 4 · Tarjetas de crédito (F04) — ✅ COMPLETADA (2026-07-02)
- [x] CRUD tarjetas, consumos (gastos con `creditCardId`), pagos, alertas, utilización,
      días restantes, historial mensual y gráficos.
- [x] Calendario de pagos, recordatorios de pago, detalle por tarjeta (`/cards/:id`).
- **Entregable:** gestión completa de tarjetas. ✔ verificado end-to-end.

## Fase 5 · Metas y fondo de emergencia (F05, F06)
- [x] Metas ilimitadas + aportes/retiros + progreso, detalle (`/goals/:id`), gráficos
      (donut, aportes, proyección) e historial. ✔ verificado.
- [x] Página dedicada de fondo de emergencia con cobertura y objetivos 3/6/12. ✔ verificado.
- **Entregable:** seguimiento de objetivos (metas + fondo de emergencia completados).

## Fase 6 · Presupuesto (F07) — ✅ COMPLETADA (2026-07-02, adelantada con el módulo de gastos)
- [x] Presupuestos mensuales por categoría (+ general), gastado/disponible/proyección, alertas.
- [x] `budgetStatusQuery` + `useBudgetOverview` + `BudgetPage`/`BudgetDialog`.
- **Entregable:** control de gasto mensual. ✔ verificado.

## Fase 7 · Estadísticas (F08) — ✅ COMPLETADA (2026-07-03)
- [x] Gráficos completos: categorías, métodos de pago, metas, tarjetas, evolución del
      patrimonio, comparación mensual/anual y proyecciones interactivas (8 pestañas). ✔ verificado.
- **Entregable:** analítica visual.

## Fase 8 · Simulador y proyecciones (F09, F10) — ✅ COMPLETADA (2026-07-05)
- [x] Pólizas: simulador interactivo de depósitos a plazo (capital, tasa, plazo, periodicidad)
      con monto final, intereses, rentabilidad y **tasa efectiva anual**; guardar/editar/eliminar
      escenarios y **tabla + gráfico comparativos**. ✔ verificado.
- [x] Proyecciones: patrimonio a 1/3/5/10/15/20 años en **tres escenarios** (conservador 3 %,
      base 5 %, agresivo 8 %) con ahorro mensual ajustable, gráfico multi-línea y tabla. ✔ verificado.
- [x] `lib/calc/interest.ts` (interés compuesto/simple) con tests de fórmulas (9 casos).
- **Entregable:** herramientas de decisión.

## Fase 9 · Inteligencia financiera (F10b) — ✅ COMPLETADA (2026-07-05)
- [x] Motor de reglas (Strategy) en `lib/insights/`: `types`, `engine` (puro) y una regla por
      familia en `rules/` — comparativa de gasto, oportunidad por categoría, capacidad de ahorro,
      fondo de emergencia, utilización de tarjetas y avance de metas/ritmo de ahorro.
- [x] `insights.service` construye el contexto (agregados reales) y ejecuta el motor; hook
      `useInsights` reactivo; `InsightsPage` + `InsightCard` con severidad/orden. ✔ verificado.
- [x] Tests del motor (6 casos, una familia cada uno + orden por severidad).
- **Entregable:** análisis automático accionable con las 6 familias del PDF.

## Fase 10 · Exportación y respaldos (F11) — ✅ COMPLETADA (2026-07-05)
- [x] Export **Excel** (SheetJS) de movimientos + hoja resumen y **PDF** (jsPDF + autotable)
      con informe financiero (KPIs, metas, tarjetas). Ambas librerías con carga diferida.
- [x] Export/import de **respaldo JSON versionado**, validado con Zod (`backup.schema`) y
      restauración atómica (transacción Dexie). Descarga de respaldos guardados.
- [x] **Auto-backup** al arranque (`maybeRunAutoBackup`) según intervalo y retención de settings.
- [x] UI en Configuración (`DataBackupCard`): exportar, respaldar, restaurar, toggle de
      auto-respaldo y lista de respaldos locales. ✔ verificado end-to-end (round-trip).
- **Entregable:** portabilidad y seguridad de datos.

## Fase 11 · Configuración + pulido PWA (F12, F13) — ✅ COMPLETADA (2026-07-05)
- [x] **Configuración editable** (`GeneralSettingsCard`): moneda, idioma/formato, inicio de mes,
      meta de ahorro mensual, objetivos del fondo de emergencia y respaldo automático
      (frecuencia/retención); validación Zod centralizada en `updateSettings`. ✔ verificado.
- [x] **Gestión de categorías** (`CategoriesCard`): crear/editar/archivar/eliminar por tipo, con
      **reasignación** al eliminar categorías en uso (integridad referencial) y set de iconos
      propio (`categoryIcons`). ✔ verificado (crear/eliminar end-to-end).
- [x] Tema claro/oscuro (toggle en la cabecera).
- [x] PWA: manifest, iconos, offline y **prompt de actualización** (`pwa.ts`) ya en su sitio;
      `prefers-reduced-motion` respetado en `globals.css`.
- **Entregable:** instalable en Windows/Android, look "bancario".
- _Pendiente menor:_ self-hosting de la fuente Inter (hoy `system-ui` de fallback).

## Fase 12 · Calidad final — ✅ COMPLETADA (2026-07-05)
- [x] Cobertura de tests en `lib/calc` (`projection`), `lib/format`, y **servicios/flujos críticos**
      con `fake-indexeddb`: `metrics.service` (dashboard, categorías, tendencia, metas, presupuesto,
      fondo de emergencia) y `categories.service` (reasignación e integridad referencial). 61 tests.
- [x] Setup de pruebas (`src/test/setup.ts` con `fake-indexeddb`, helper `src/test/seed.ts`).
- [x] README y documentación al día; verificación end-to-end en navegador de cada fase.
- **Entregable:** proyecto "listo para usar".

---

### Estado actual
- [x] Requisitos analizados (PDF).
- [x] Documentación de arquitectura redactada (`docs/`).
- [x] Arquitectura aprobada por el usuario.
- [x] **Fase 0 (cimientos)** — completada y verificada.
- [x] **Fase 1 (núcleo de datos)** — completada y verificada.
- [x] **Fase 2 (movimientos + capa de datos completa)** — completada y verificada.
- [x] **Fase 3 (dashboard con cifras reales)** — completada y verificada.
- [x] **Módulo de Ingresos/Gastos ampliado** (filtros, calendario, estadísticas) + **Fase 6
      (Presupuestos)** — completados y verificados.
- [x] **Fase 4 (tarjetas de crédito)** — completada y verificada.
- [x] **Fase 5 · Metas** — completada y verificada (fondo de emergencia dedicado, pendiente).
- [x] **Fase 7 · Estadísticas** — completada y verificada.
- [x] **Fondo de emergencia (F06)** — completado y verificado.
- [x] **Fase 8 · Simulador de depósitos (F09) y proyecciones (F10)** — completada y verificada.
- [x] **Fase 9 · Inteligencia financiera (F10b)** — completada y verificada.
- [x] **Fase 10 · Exportación y respaldos (F11)** — completada y verificada.
- [x] **Fase 11 · Configuración editable + pulido PWA (F12/F13)** — completada y verificada.
- [x] **Fase 12 · Calidad final** — completada y verificada (61 tests, servicios cubiertos).
- ✅ **Todas las fases del roadmap completadas.** Proyecto listo para usar.

_El avance real se refleja marcando casillas aquí y anotando cambios en
[`changelog.md`](./changelog.md)._
