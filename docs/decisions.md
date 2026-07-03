# FinPilot — Registro de decisiones de arquitectura (ADR)

> Estado: **PROPUESTA — pendiente de aprobación**. Última actualización: 2026-07-02.
> Cada ADR documenta contexto, decisión, alternativas y consecuencias.

---

## ADR-0001 · Arquitectura feature-sliced con capas compartidas
**Contexto:** app grande, muchos dominios (dashboard, tarjetas, metas, presupuesto…).
**Decisión:** módulos verticales en `features/` + capas horizontales compartidas
(`components`, `lib`, `db`, `services`). `features` puede usar lo compartido; lo compartido
nunca importa de `features`.
**Alternativas:** (a) por tipo puro (todas las páginas juntas, todos los hooks juntos) — no
escala, acopla; (b) monorepo por paquetes — sobredimensionado para un solo usuario.
**Consecuencias:** cohesión alta por dominio, límites claros, fácil de navegar y testear.

## ADR-0002 · Dexie `liveQuery` como modelo de lectura; sin store global de dominio
**Contexto:** offline-first; IndexedDB es la fuente de la verdad.
**Decisión:** la UI observa la DB con `useLiveQuery`. El estado de dominio **no** se
replica en Redux/Zustand. Zustand queda solo para estado de UI efímero; contexto solo para
`settings`/`theme`.
**Alternativas:** Redux Toolkit + slices sincronizados con IndexedDB (duplica estado, invita
a bugs de sincronización); TanStack Query (pensado para red, innecesario sin backend).
**Consecuencias:** menos código, cero desincronización, refresco automático. Coste: pensar
en "consultas reactivas" en vez de "acciones que mutan un store".

## ADR-0003 · TypeScript estricto + tipos inferidos de Zod
**Contexto:** dominio financiero; los errores de tipo cuestan dinero.
**Decisión:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitReturns`. Zod define esquemas; los tipos se **infieren** (`z.infer`). Validación en
el borde (formularios/import).
**Alternativas:** interfaces manuales + validación imperativa (duplicación, deriva).
**Consecuencias:** una sola fuente de verdad tipo↔validación; más seguridad, algo más de
verbosidad en esquemas.

## ADR-0004 · Dinero en enteros (centavos) + librería monetaria
**Contexto:** `0.1 + 0.2 !== 0.3` en floats; inaceptable en finanzas.
**Decisión:** almacenar y operar montos como **enteros `Cents`** (branded type). Aritmética y
formateo con **dinero.js v2** (o helper propio sobre enteros/`bigint`), formateo por
`Intl.NumberFormat` según moneda/locale.
**Alternativas:** floats (impreciso); `decimal.js` (más pesado, orientado a decimales
arbitrarios, no a dinero).
**Consecuencias:** exactitud garantizada; hay que convertir en el borde de entrada/salida.
Tests de redondeo obligatorios.

## ADR-0005 · Tabla única `transactions` con discriminador `type`
**Contexto:** ingresos y gastos comparten estructura y alimentan las mismas agregaciones.
**Decisión:** una tabla `transactions` con `type: 'income' | 'expense'`; UIs separadas.
**Alternativas:** tablas separadas `incomes`/`expenses` (duplica índices, complica patrimonio
y estadísticas que necesitan ambos).
**Consecuencias:** estadísticas y balance triviales; se filtra por `type`/índice compuesto
`[type+yearMonth]`. La UI sigue mostrando secciones separadas según requisito.

## ADR-0006 · Manejo de errores por capas con jerarquía `AppError`
**Contexto:** hay que dar feedback claro sin fugar errores crudos de Dexie.
**Decisión:** validación Zod en el borde; services lanzan `AppError` tipados; `handleError`
mapea a toasts (`sonner`); Error Boundaries por ruta + global con "exportar respaldo de
emergencia".
**Consecuencias:** errores predecibles y localizados; el usuario nunca pierde datos por un
fallo de render.

## ADR-0007 · Cálculos derivados en lugar de agregados almacenados
**Contexto:** patrimonio, balance, % ahorro, utilización, etc.
**Decisión:** calcular al vuelo desde datos primarios; persistir solo `netWorthSnapshots`
para la serie histórica.
**Alternativas:** guardar totales (se desincronizan ante cada edición/borrado).
**Consecuencias:** siempre consistente; coste de cómputo mitigado por índices y memoización de
`useLiveQuery`.

## ADR-0008 · PWA con vite-plugin-pwa, `registerType: 'prompt'`
**Contexto:** instalable en Windows/Android, 100 % offline, sin API remota.
**Decisión:** Workbox `generateSW`, precache del app-shell, fuentes self-hosted, manifest con
iconos maskable; avisar (no forzar) actualizaciones.
**Consecuencias:** offline real; el usuario controla cuándo actualizar (evita perder trabajo).

## ADR-0009 · React Router con rutas lazy y constantes centralizadas
**Contexto:** varias pantallas pesadas (gráficos, export).
**Decisión:** `createBrowserRouter`, `lazy` por feature (code-splitting), rutas en
`constants/routes.ts`.
**Consecuencias:** arranque rápido; sin strings mágicos; navegación tipada.

## ADR-0010 · Zustand para estado de UI efímero
**Contexto:** modales, quick-add, command palette.
**Decisión:** Zustand mínimo, fuera del dominio.
**Alternativas:** Context (re-renders amplios), Redux (boilerplate).
**Consecuencias:** simple y performante; frontera clara con el estado persistente.

## ADR-0011 · Respaldo JSON versionado como mecanismo primario de portabilidad
**Contexto:** sin nube; el usuario debe poder mover/recuperar sus datos.
**Decisión:** export/import JSON con `schemaVersion` + validación Zod + migración; auto-backup
local con retención; export secundario a Excel/PDF para reportes.
**Consecuencias:** portabilidad y seguridad de datos sin backend.

## ADR-0012 · shadcn/ui (copy-in) + Tailwind tokens por CSS variables
**Contexto:** UI profesional, personalizable, claro/oscuro sin FOUC.
**Decisión:** componentes shadcn dentro del repo (`components/ui`), tema por CSS vars,
`darkMode: 'class'`, aplicación de clase antes del primer paint.
**Consecuencias:** control total del look "bancario"; sin dependencia opaca de UI.

---

### Decisiones abiertas (a confirmar con el usuario)
- **DEC-A:** ¿Librería monetaria **dinero.js** vs. helper propio sobre enteros? (Recomendado:
  helper propio ligero + `Intl` para no arrastrar dependencia; dinero.js si se prevé
  multi-moneda pronto.)
- **DEC-B:** ¿Incluir **Framer Motion** desde v1 o empezar solo con `tailwindcss-animate`?
  (Recomendado: `tailwindcss-animate` primero; Framer Motion cuando haya transiciones de
  página complejas.)
- **DEC-C:** ¿Onboarding con **asistente de carga inicial** de los datos del PDF?
  (Recomendado: sí, opcional y saltable.)
