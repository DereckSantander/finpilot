# FinPilot — Roadmap de implementación

> Estado: **PROPUESTA — pendiente de aprobación**. Última actualización: 2026-07-02.
> Plan por fases. La implementación **no comienza hasta la aprobación** de la arquitectura.

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

## Fase 8 · Simulador y proyecciones (F09, F10)
- Pólizas (interés compuesto, comparación de escenarios) + proyecciones a N años.
- `lib/calc/interest.ts` con tests de fórmulas.
- **Entregable:** herramientas de decisión.

## Fase 9 · Inteligencia financiera (F10b)
- Motor de reglas (Strategy) con las 6 familias de insight del PDF.
- **Entregable:** análisis automático accionable.

## Fase 10 · Exportación y respaldos (F11)
- Export Excel/PDF; export/import respaldo JSON versionado; auto-backup.
- **Entregable:** portabilidad y seguridad de datos.

## Fase 11 · Configuración + pulido PWA (F12, F13)
- Moneda/locale/tema/categorías; manifest, iconos, offline, prompt de actualización.
- Animaciones, responsive final, accesibilidad, `prefers-reduced-motion`.
- **Entregable:** instalable en Windows/Android, look "bancario".

## Fase 12 · Calidad final
- Cobertura de tests en `lib/calc`, services y flujos críticos.
- README completo, instrucciones de instalación, verificación end-to-end.
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
- [ ] Siguiente: pólizas/simulador de depósitos (F09), inteligencia financiera (F10b),
      exportación/respaldos (F11).

_El avance real se refleja marcando casillas aquí y anotando cambios en
[`changelog.md`](./changelog.md)._
