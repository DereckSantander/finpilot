# FinPilot — Registro de decisiones de arquitectura (ADR)

> Estado: **APROBADO** (implementado). Última actualización: 2026-08-12.
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

### Decisiones cerradas

- **DEC-A — Librería monetaria.** *Resuelta: helper propio.* El dinero es un entero de
  centavos con tipo branded (`Cents`, `types/money.ts`) y la aritmética vive en
  `lib/money.ts`. No se añadió `dinero.js`. Se reevaluará solo si aparece multi-moneda.
- **DEC-B — Animaciones.** *Resuelta: `tailwindcss-animate`.* No se añadió Framer Motion;
  las transiciones actuales (diálogos, acordeones) se resuelven con CSS.
- **DEC-C — Onboarding.** *Resuelta: sí, mínimo y saltable.* Implementado en
  `features/onboarding/OnboardingDialog.tsx`: tres pasos (moneda/idioma, meta de ahorro y una
  primera meta opcional) montado en `AppLayout`. Consume la bandera
  `settings.onboardingCompleted`, que llevaba desde el inicio en el esquema sin que nadie la
  leyera. **Toda** salida —terminar, «Omitir», la X o Escape— la marca como completada, así que
  no hay forma de quedar atrapado ni de que reaparezca; se puede relanzar desde Configuración.

---

## ADR-0013 — Ledger Facade para las métricas derivadas

**Contexto:** `metrics.service.ts` había crecido a 992 líneas y 20 consultas, cada una
yendo a Dexie por su cuenta. De ahí salieron bugs reales: el saldo por tarjeta estaba
implementado cuatro veces y el "total ahorrado", dos, con reglas distintas que discrepaban
al archivar una meta financiada. Además `insightsQuery()` releía la tabla de movimientos
tres o cuatro veces por llamada.

**Decisión:** cargar los datos primarios una sola vez en un objeto `Ledger` inmutable
(`services/ledger/`) y derivar todas las métricas con funciones puras
`Derivation<Args, T> = (ledger, ...args) => T` (`services/derive/`). `fromLedger` las
envuelve para `useLiveQuery` conservando las firmas públicas, así que ningún componente
cambió. Las magnitudes compartidas (`cardBalances`, `savedByGoal`) viven en `LedgerIndex`,
donde solo pueden tener una definición.

**Alternativas:** seguir corrigiendo cada duplicado caso por caso (era lo que se venía
haciendo, y reaparecían); memoizar/cachear por tick (añade invalidación que no hace falta
a este volumen de datos).

**Consecuencias:** una magnitud = una definición, por construcción. `insightsQuery` pasa de
~20 lecturas de tabla a 11 (fijado por un test). `LedgerScope` acota qué tablas lee cada
consulta para que `useLiveQuery` no revalide de más — **hay que pasarlo** en cada consulta
nueva. Es el mismo patrón que `InsightRule` ya usaba en `lib/insights`, generalizado.

---

## ADR-0014 — `buildPatch` para las actualizaciones parciales

**Contexto:** cada `updateX` repetía a mano la cadena
`...(data.campo !== undefined && { campo: ... })`, diez veces. Olvidar un campo no daba
ningún error: se perdía en silencio (fue exactamente lo que pasó con `creditCardId` en
`updateStatement`).

**Decisión:** `lib/repository/patch.ts` declara el mapeo campo→conversión una vez. El tipo
`PatchSpec` usa un mapped type con `-?`, de modo que **cubrir todas las claves comunes
entre la entrada y la fila es obligatorio en tiempo de compilación**.

**Alternativas:** un `createCrudRepository` genérico sobre los 12 servicios. Se descartó
para los que tienen integridad de dominio propia (movimientos, metas, aportes, métodos de
pago, presupuestos): enterrar esa lógica en un genérico la vuelve invisible.

**Consecuencias:** menos repetición y, sobre todo, un campo olvidado deja de compilar. Los
campos a `null` se devuelven en `unset` porque Dexie no borra propiedades vía `update`.

---

## ADR-0015 — `settings.startOfMonth` queda reservado, no se implementa

**Contexto:** el campo era editable en Configuración pero **ningún cálculo lo leía**: todas
las métricas usan meses naturales. El control prometía algo que no ocurría.

**Decisión:** retirar el control de la interfaz y conservar el campo en el esquema
(documentado como reservado) para no invalidar respaldos ni filas existentes.

**Consecuencias:** honrarlo de verdad exigiría que `TransactionRow.yearMonth` dejara de
derivarse de `date`, lo que rompería los índices `[type+yearMonth]` y `[yearMonth+categoryId]`
y todos los gráficos. Es una funcionalidad con coste de migración, no un ajuste pendiente.
