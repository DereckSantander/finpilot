# FinPilot — Arquitectura del Proyecto

> Documento maestro de arquitectura. Estado: **APROBADO** (implementado).
> Última actualización: 2026-08-12.

FinPilot es una aplicación **personal de finanzas**, _offline-first_, instalable como PWA
en Windows y Android, sin backend y sin autenticación. Está pensada para un solo usuario,
pero con una arquitectura lo bastante limpia para evolucionar a producto comercial.

Este documento describe **el porqué** de cada decisión. Los detalles del modelo de datos
viven en [`database.md`](./database.md); el catálogo funcional en [`features.md`](./features.md);
las decisiones formales (ADR) en [`decisions.md`](./decisions.md).

---

## 1. Principios rectores

1. **Local-first / Offline-first.** La base de datos del navegador (IndexedDB) es la
   _fuente de la verdad_. La app debe ser 100 % funcional sin red. No hay servidor que
   consultar; por tanto no necesitamos capa de fetching remoto ni caché de red de datos.
2. **La UI es una proyección reactiva de la base de datos.** En lugar de duplicar el
   estado del dominio en un store global, las vistas se _suscriben_ a consultas Dexie
   mediante `liveQuery`. Cuando un dato cambia en IndexedDB, la UI se actualiza sola.
   Esto elimina la clase entera de bugs de "estado desincronizado".
3. **Precisión monetaria absoluta.** Nunca se opera dinero con `float`. Todos los montos
   se almacenan como **enteros en la unidad mínima (centavos)** y se formatean solo en
   el borde de presentación. Ver ADR-0004.
4. **Tipado estricto de extremo a extremo.** El esquema de validación (Zod) es la única
   fuente de verdad de los tipos; los tipos de TypeScript se _infieren_ de él. Un dato
   que entra a la base de datos ya fue validado.
5. **Separación por capas + módulos verticales (feature-sliced).** Código compartido en
   capas horizontales (`components/ui`, `lib`, `db`); cada dominio de negocio en su propia
   carpeta vertical (`features/expenses`, `features/goals`, …). Ver §3.
6. **Cálculo derivado, no almacenado.** El patrimonio, el balance mensual, el % de ahorro,
   la utilización de cupo, etc. se **calculan** a partir de datos primarios (transacciones,
   tarjetas…). No se guardan valores agregados que puedan quedar obsoletos, salvo
   _snapshots_ históricos explícitos (evolución del patrimonio).

---

## 2. Stack tecnológico

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Framework UI | **React 18** | Solicitado. Concurrent features, ecosistema maduro. |
| Lenguaje | **TypeScript** (strict) | Solicitado. Seguridad de tipos en dominio financiero. |
| Bundler / dev | **Vite 5** | Solicitado. Arranque instantáneo (ESM), HMR, build optimizado. |
| Estilos | **Tailwind CSS** | Solicitado. Utilidades + _design tokens_ por CSS vars. |
| Componentes | **shadcn/ui** (Radix UI) | Solicitado. Componentes accesibles, _copy-in_ (no dependencia opaca), personalizables. |
| Base de datos | **IndexedDB vía Dexie** | Solicitado. API ergonómica sobre IndexedDB, migraciones, transacciones. |
| Reactividad DB | **dexie-react-hooks** (`useLiveQuery`) | Suscripciones reactivas: la UI se refresca al cambiar la DB. |
| Gráficos | **Chart.js** + `react-chartjs-2` | Solicitado. Wrapper React idiomático. |
| PWA | **vite-plugin-pwa** (Workbox) | Genera SW, manifest, precache del app-shell, prompt de actualización. |
| Enrutado | **React Router v6** | Estándar de facto, rutas anidadas, _lazy loading_ por ruta. |
| Formularios | **Zod** en el service + `useState` en el diálogo; **React Hook Form** solo en `TransactionForm` | La validación de dominio vive en los esquemas Zod (ADR-0003). Generalizar RHF a todos los formularios sigue pendiente. |
| Estado UI efímero | **Zustand** | Modales, _quick-add_, panel de comandos. Mínimo, sin boilerplate. (El estado de dominio NO vive aquí — vive en Dexie). |
| Dinero | **Helper propio** (`lib/money.ts`) sobre enteros branded `Cents` | Aritmética monetaria segura sin dependencia externa; formateo con `Intl`. Se descartó dinero.js (DEC-A). Ver ADR-0004. |
| Fechas | **date-fns** | Modular, inmutable, _tree-shakeable_, soporte de _locale_ es/en. |
| Iconos | **lucide-react** | Set usado por shadcn/ui, consistente y ligero. |
| Animaciones | **`tailwindcss-animate`** | Micro-interacciones de shadcn y transiciones de diálogo. Se descartó Framer Motion (DEC-B): no hizo falta. |
| IDs | **nanoid** | IDs cortos, URL-safe, sin dependencia de crypto pesada. |
| Export Excel | **SheetJS (xlsx)** | Estándar para `.xlsx` en cliente. |
| Export PDF | **jsPDF** + `jspdf-autotable` | Generación de PDF y tablas en cliente, sin servidor. |
| Notificaciones | **sonner** | Toasts accesibles para feedback y errores. |
| Tests | **Vitest** (entorno `node`) + **fake-indexeddb** | Lógica pura y services contra una IndexedDB real en memoria. **No hay pruebas de componentes**: no está instalado React Testing Library ni un DOM (jsdom). Cuando la lógica de un componente merezca prueba, se extrae a una función pura y se prueba en `node` (p. ej. `monthProgress` en `lib/date.ts`). |
| Lint / formato | **ESLint** + **Prettier** + `eslint-plugin-tailwindcss` | Calidad y consistencia. |
| Git hooks | **husky** + **lint-staged** | Bloquea commits que no pasan lint/typecheck. |

> **Sin backend, sin auth** (requisito explícito). No se incluyen: axios/fetch de datos,
> TanStack Query, Redux, ni ninguna librería de servidor.

---

## 3. Arquitectura de carpetas

Modelo **feature-sliced** con capas compartidas. Regla de dependencias: `features/` puede
usar capas compartidas (`components`, `lib`, `db`, `services`, `hooks`, `types`); las capas
compartidas **nunca** importan de `features/`. Esto evita ciclos y mantiene el núcleo reusable.

```
finpilot/
├── docs/                       # Documentación viva (este directorio)
├── public/                     # Estáticos, iconos PWA, manifest source
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json             # config de shadcn/ui
└── src/
    ├── main.tsx                # Punto de entrada, monta <App/>, registra SW
    ├── app/                    # Shell de la aplicación
    │   ├── App.tsx             # Composición raíz
    │   ├── router.tsx          # Definición de rutas (React Router)
    │   ├── providers/          # Providers globales compuestos
    │   │   ├── AppProviders.tsx
    │   │   ├── ThemeProvider.tsx
    │   │   └── SettingsProvider.tsx
    │   └── layouts/
    │       ├── AppLayout.tsx   # Sidebar + topbar + <Outlet/>
    │       └── AuthlessGuard.tsx (n/a — placeholder para futuro)
    │
    ├── features/               # Módulos verticales de dominio
    │   ├── dashboard/
    │   │   ├── components/      # Widgets del dashboard (KPICards, etc.)
    │   │   ├── hooks/           # useDashboardMetrics, etc.
    │   │   └── DashboardPage.tsx
    │   ├── income/
    │   ├── expenses/           # incluye quick-add < 5s
    │   ├── credit-cards/
    │   ├── goals/
    │   ├── emergency-fund/
    │   ├── budget/
    │   ├── statistics/
    │   ├── deposits/           # Pólizas / simulador plazo fijo
    │   ├── projections/
    │   ├── insights/           # Inteligencia financiera
    │   ├── settings/
    │   └── backup/             # Export/import respaldo, Excel, PDF
    │
    ├── components/             # UI compartida
    │   ├── ui/                 # Primitivas shadcn/ui (Button, Dialog, …)
    │   ├── charts/             # Wrappers Chart.js reutilizables
    │   ├── common/             # Componentes compuestos (EmptyState, PageHeader…)
    │   └── forms/              # Campos de formulario reutilizables (MoneyInput…)
    │
    ├── db/                     # Capa de persistencia (Dexie)
    │   ├── db.ts               # Instancia Dexie + declaración de stores
    │   ├── schema.ts           # Interfaces de tablas (row types)
    │   ├── migrations.ts       # Versiones y upgrades
    │   └── seed.ts             # Categorías/métodos de pago por defecto
    │
    ├── services/              # Lógica de dominio y acceso a datos (por dominio)
    │   ├── ledger/                 # ADR-0013: foto única de los datos primarios
    │   │   ├── types.ts            #   Ledger, LedgerIndex, Derivation, LedgerScope
    │   │   ├── load.ts             #   loadLedger() + índices derivados
    │   │   └── adapt.ts            #   fromLedger(): derivación → query reactiva
    │   ├── derive/                 # Derivaciones puras del ledger (sin Dexie)
    │   │   ├── series.ts           #   monthSeries(): único bucle de meses
    │   │   ├── dashboard.ts        #   KPIs, desgloses, tendencia, patrimonio, fondo
    │   │   ├── cards.ts            #   resumen, detalle, historial y movimientos
    │   │   ├── goals.ts            #   progreso, detalle y proyección de metas
    │   │   ├── budgets.ts          #   estado de presupuestos del mes
    │   │   └── statistics.ts       #   totales anuales y desglose por método
    │   ├── metrics.service.ts      # Fachada: expone las *Query públicas
    │   ├── transactions.service.ts
    │   ├── categories.service.ts
    │   ├── paymentMethods.service.ts
    │   ├── creditCards.service.ts
    │   ├── creditCardStatements.service.ts
    │   ├── creditCardPayments.service.ts
    │   ├── goals.service.ts
    │   ├── goalContributions.service.ts
    │   ├── budgets.service.ts
    │   ├── deposits.service.ts     # escenarios del simulador
    │   ├── insights.service.ts     # motor de inteligencia financiera
    │   ├── netWorth.service.ts     # snapshots de patrimonio
    │   ├── attachments.service.ts
    │   ├── reminders.service.ts
    │   ├── tags.service.ts
    │   ├── settings.service.ts
    │   ├── backups.service.ts      # export/import JSON
    │   ├── autoBackup.service.ts
    │   └── export.service.ts       # Excel / PDF
    │
    ├── hooks/                 # Hooks compartidos (transversales)
    │   ├── useSettings.ts, useCategories.ts, usePaymentMethods.ts, …
    │   ├── useTheme.ts
    │   ├── useMediaQuery.ts
    │   └── useDebouncedValue.ts
    │
    ├── context/              # Contextos globales (definición + hook consumidor)
    │   ├── settings.context.ts
    │   └── theme.context.ts
    │
    ├── lib/                  # Utilidades puras, sin estado React
    │   ├── money.ts          # aritmética monetaria sobre centavos
    │   ├── date.ts           # helpers date-fns + monthProgress()
    │   ├── format.ts         # formateo de números, %, etc.
    │   ├── calc/             # fórmulas financieras puras (interés compuesto…)
    │   ├── insights/         # motor de reglas (engine + rules/)
    │   ├── repository/       # ADR-0014: buildPatch() para updates parciales
    │   ├── errors.ts         # jerarquía AppError
    │   ├── handle-error.ts   # sumidero único de errores hacia la UI
    │   ├── validation/       # esquemas Zod compartidos
    │   └── cn.ts             # helper de clases (clsx + tailwind-merge)
    │
    ├── types/               # Tipos globales / branded types
    │   ├── money.ts          # type Cents = Branded<number,'Cents'>
    │   ├── ids.ts            # tipos de ID por entidad
    │   └── common.ts
    │
    ├── constants/           # Constantes e inmutables
    │   ├── routes.ts         # rutas centralizadas
    │   ├── categories.ts     # categorías semilla
    │   ├── currencies.ts
    │   └── config.ts         # nombre app, versión de esquema, límites
    │
    │   (los `defaults` de Chart.js viven hoy en components/charts/setup.ts;
    ├── config/              # Configuración de librerías
    │   └── chart.ts          # opciones compartidas de Chart.js (ejes, tooltip)
    │                         # (el registro y los defaults siguen en charts/setup.ts)
    │
    └── styles/
        ├── globals.css       # Tailwind base + CSS vars de tema
        └── themes.css        # tokens claro/oscuro
```

**Anatomía de un `feature/`**: cada módulo expone una `*Page.tsx` (consumida por el router),
una carpeta `components/` con piezas locales, y `hooks/` con lógica de presentación
específica. La lógica de negocio pura y el acceso a datos viven en `services/` (compartido),
para poder testearse sin React y reutilizarse entre features (p. ej. `insights` consume
`statistics` y `networth`).

---

## 4. Patrones de diseño

- **Repository / Service Layer.** Ningún componente habla con Dexie directamente. Los
  `services/*.service.ts` encapsulan las consultas y las reglas de negocio. Beneficio:
  testeabilidad, y punto único donde enchufar un backend futuro (solo cambia la
  implementación del service).
- **Reactive read model (CQRS ligero).** _Escrituras_ pasan por services (validan + mutan).
  _Lecturas_ reactivas via `useLiveQuery`. La UI no "pide" datos: los observa.
- **Schema-first / Parse-don't-validate.** Zod define el esquema; los tipos se infieren; en
  el borde (formularios, import de respaldo) se _parsea_ y a partir de ahí el tipo es seguro.
- **Compound Components** (shadcn/Radix) para piezas complejas (Dialog, Select, Tabs).
- **Provider Pattern** para transversales (tema, settings) — pero mínimo, porque el estado
  de dominio no vive en contexto.
- **Strategy** en el motor de `insights`: cada "regla" (p. ej. "gastaste X% más") es una
  función pura `(context) => Insight | null`; el motor recorre y agrega las reglas activas.
- **Adapter** en export: una capa que transforma el modelo de dominio a la forma que
  esperan SheetJS / jsPDF.
- **Branded Types** para prevenir mezclar `Cents` con `number` normal o IDs entre entidades.

---

## 5. Gestión del estado global

Tres niveles claramente separados (ver ADR-0002):

1. **Estado de dominio (persistente):** vive en **IndexedDB/Dexie**. Se lee con
   `useLiveQuery`. No se replica en memoria global. Ejemplos: transacciones, tarjetas,
   metas, presupuestos.
2. **Estado de configuración (persistente, global):** `settings` (moneda, tema, locale,
   config del fondo de emergencia). Vive en Dexie (tabla `settings`), pero se expone por
   un **`SettingsProvider`** que hace `useLiveQuery` una sola vez y lo distribuye por
   contexto para evitar múltiples suscripciones.
3. **Estado de UI efímero (no persistente):** **Zustand**. Modales abiertos, borrador del
   _quick-add_ de gasto, estado del command palette, filtros temporales de una tabla.
   Se descarta al recargar.

Regla: si un dato debe sobrevivir a un refresco → Dexie. Si es puramente visual y temporal
→ Zustand o estado local del componente.

---

## 6. Flujo de navegación

Layout persistente (sidebar + topbar) con `<Outlet/>`. Rutas _lazy-loaded_ por feature.

```
AppLayout
├── /                    Dashboard (centro de control)
├── /income             Ingresos (listado, alta, edición)
├── /expenses           Gastos (quick-add, listado, filtros, adjuntos)
├── /cards              Tarjetas de crédito (listado + alertas)
│   └── /cards/:id      Detalle de tarjeta (cupo, cortes, historial)
├── /goals              Metas (listado + progreso)
│   └── /goals/:id      Detalle de meta (aportes, proyección)
├── /emergency-fund     Fondo de emergencia (cobertura en meses)
├── /budget             Presupuesto mensual (por categoría, alertas)
├── /statistics         Estadísticas (gráficos comparativos)
├── /deposits           Pólizas / simulador de depósitos a plazo
├── /projections        Proyecciones (1/3/5/10/15/20 años)
├── /insights           Inteligencia financiera (análisis automático)
└── /settings           Configuración
    ├── /settings/categories
    ├── /settings/backup      (export/import, Excel, PDF)
    └── /settings/general     (moneda, tema, locale)
```

**Acciones globales** (independientes de la ruta): un botón/atajo de **"+ Gasto rápido"**
disponible desde cualquier pantalla (objetivo < 5 s), montado en el layout y respaldado por
un modal Zustand. Command palette (⌘K) opcional en fase posterior.

El detalle completo de rutas, `loader`s y _lazy imports_ está en §"Estructura de rutas".

---

## 7. Organización de componentes

Tres círculos concéntricos:

- **`components/ui/`** — Primitivas shadcn/ui. Sin lógica de negocio. Ej.: `Button`,
  `Dialog`, `Card`, `Input`, `Select`, `Tabs`, `Badge`, `Progress`.
- **`components/common/` + `components/forms/` + `components/charts/`** — Composiciones
  reutilizables agnósticas de dominio: `PageHeader`, `EmptyState`, `StatCard`,
  `ConfirmDialog`, `MoneyInput`, `CategoryPicker`, `DateTimeInput`, `LineChart`,
  `DonutChart`. Reutilizables por cualquier feature.
- **`features/<x>/components/`** — Piezas específicas del dominio, no reutilizables fuera.
  Ej.: `CreditCardUtilizationRing`, `GoalProgressCard`, `EmergencyFundGauge`.

Convención de tamaño: un componente que supere ~150 líneas o mezcle _fetching_ + _layout_ +
_lógica_ se descompone. La lógica va a un hook; el _layout_ queda declarativo.

---

## 8. Hooks personalizados

- **De datos (envuelven `useLiveQuery` + service):** `useTransactions(filter)`,
  `useCategories()`, `useCreditCards()`, `useGoals()`, `useBudget(month)`,
  `useSettings()`, `useDashboardMetrics(month)`, `useNetWorth()`, `useInsights()`.
  Encapsulan la consulta reactiva y devuelven datos ya tipados y (si aplica) derivados.
- **De UI:** `useTheme()`, `useMediaQuery()`, `useDebouncedValue()`, `useQuickAdd()` (Zustand).
  La confirmación se resuelve con el componente `components/common/ConfirmDialog.tsx`, no con
  un hook `useConfirm()` basado en promesas.
- **De gráficos:** `useChartConfig(build, deps)` memoiza la configuración de Chart.js añadiendo
  el tema a las dependencias. `themeColor()` lee variables CSS, una dependencia que el linter no
  puede ver; concentrarla aquí redujo de 15 a 1 los `eslint-disable` de `exhaustive-deps`.
- **De formularios:** el andamiaje común (cabecera, `<form>`, error, pie Cancelar/Guardar) vive en
  `components/forms/FormDialog.tsx`, que usan 12 de los 13 diálogos. `TransactionDialog` queda
  fuera a propósito: solo envuelve a `TransactionForm`, que ya gestiona su propio envío.
  El estado sigue siendo `useState` campo a campo y la validación, Zod en el service; unificarlo
  en un `useEntityForm()` (RHF + resolver Zod) está identificado pero **no hecho**.

Regla: **un hook por preocupación**. Los hooks de datos no renderizan; los componentes no
consultan la DB directamente.

---

## 9. Servicios (capa de dominio)

Cada service es un módulo de funciones puras/asíncronas sobre Dexie. Contrato típico:

- Lecturas: devuelven promesas o _queries_ para `liveQuery`.
- Escrituras: validan con Zod → ejecutan en **transacción Dexie** → devuelven la entidad.
- Cálculos: funciones **puras** (sin tocar DB) para poder testearse aisladas — p. ej.
  `deposits.service` calcula interés compuesto; `projections.service` proyecta a N años;
  `emergencyFund.service` calcula cobertura en meses; `insights.service` ejecuta reglas.

Los cálculos financieros puros viven en `lib/calc/` y los services los orquestan con datos.

---

## 10. Manejo de errores

Estrategia en capas (detalle en [`decisions.md`](./decisions.md) ADR-0006):

1. **Validación de entrada:** Zod en el borde (formularios, import). Errores → mensajes de
   campo (RHF) en el idioma del usuario.
2. **Errores de dominio/DB:** jerarquía `AppError` (`ValidationError`, `NotFoundError`,
   `QuotaExceededError`, `BackupError`…). Los services lanzan `AppError` tipados; nunca
   fugan errores crudos de Dexie a la UI.
3. **Feedback:** un helper `handleError(e)` mapea `AppError` → toast (`sonner`) legible.
4. **Error Boundaries:** una por ruta (`RouteErrorBoundary`) + una global de _fallback_ que
   ofrece "recargar" y "exportar respaldo de emergencia" (para no perder datos ante un fallo
   de render).
5. **Cuota de almacenamiento:** se vigila `navigator.storage.estimate()`; al acercarse al
   límite se avisa y se sugiere respaldo/limpieza de adjuntos.

---

## 11. Sistema de temas

- **Modo claro y oscuro** (requisito). Estrategia Tailwind `darkMode: 'class'`.
- **Design tokens** por **CSS custom properties** (patrón shadcn): `--background`,
  `--foreground`, `--primary`, `--muted`, `--accent`, `--destructive`, `--ring`, etc.,
  definidos para `:root` (claro) y `.dark` (oscuro) en `styles/themes.css`. Tailwind los
  referencia vía `hsl(var(--...))`. Cambiar de tema = alternar una clase; cero re-render de
  lógica.
- **Paleta:** minimalista y "bancaria" — neutros fríos + un color primario sobrio (azul/
  teal profundo) y semánticos para ingresos (verde), gastos (rojo/ámbar) y alertas.
- **Persistencia:** el tema elegido se guarda en `settings` (Dexie). Fallback inicial a
  `prefers-color-scheme`. El `ThemeProvider` aplica la clase antes del primer paint (script
  inline en `index.html`) para evitar _flash_ (FOUC).
- **Animaciones suaves:** transiciones de color en cambio de tema y `framer-motion` para
  entrada/salida de páginas y listas, respetando `prefers-reduced-motion`.

---

## 12. Estrategia PWA

- **vite-plugin-pwa** con Workbox (`generateSW`), `registerType: 'prompt'` (avisar al usuario
  cuando hay nueva versión, no recargar sin permiso).
- **Precache del app-shell** (JS/CSS/HTML/fuentes/iconos). Como no hay API remota, no hay
  caché de datos de red: los datos están en IndexedDB.
- **Manifest** con `name`, `short_name`, `theme_color`, `background_color`, `display:
  standalone`, orientación, e **iconos** (192, 512, maskable) + iconos para Windows.
  Instalable en **Windows (Edge/Chrome)** y **Android**.
- **Fuentes** self-hosted y precacheadas (sin depender de Google Fonts en runtime) para
  garantizar offline real.
- **Actualizaciones:** banner "Nueva versión disponible → Actualizar" vía evento del SW.
- **iOS** (fuera de requisito) queda soportado _best-effort_ con metas apropiadas.

---

## 13. Estrategia de respaldos

Dos ejes (ver [`features.md`](./features.md) §Exportación y [`database.md`](./database.md) §Backup):

1. **Respaldo/restauración completa (JSON):** `backup.service` serializa **todas** las
   tablas + versión de esquema a un JSON descargable. La importación **valida versión y
   forma con Zod**, y si el esquema es anterior aplica migraciones antes de restaurar. Los
   adjuntos (Blobs) se incluyen codificados (base64) o en un `.zip` (fase 2) si el volumen
   crece.
2. **Auto-respaldo local:** _snapshot_ periódico (configurable) guardado en una tabla
   `backups` con política de retención (p. ej. últimos N). Botón "descargar último respaldo".
3. **Reportes (no son respaldo, son export):** **Excel** (SheetJS) y **PDF** (jsPDF) de
   movimientos, presupuesto y estadísticas.

Principio: **el usuario nunca debe poder perder sus datos por un fallo de la app o por
migración**; por eso se ofrece respaldo de emergencia incluso desde la Error Boundary global.

---

## 14. Estructura de rutas (técnica)

- Rutas centralizadas en `constants/routes.ts` (nunca strings mágicos dispersos).
- `createBrowserRouter` con un layout raíz (`AppLayout`) y rutas hijas **lazy** (`lazy: () =>
  import('@/features/…/XPage')`), lo que hace _code-splitting_ por pantalla → arranque rápido.
- Cada ruta define su `errorElement` (`RouteErrorBoundary`).
- No hay `loader`s de red; si se usan `loader`s Dexie serán mínimos — el patrón principal es
  `useLiveQuery` dentro de la página.
- 404 → `NotFoundPage`.

---

## 15. Convenciones de nombres

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Carpeta de feature | kebab-case | `credit-cards/` |
| Componente (archivo y símbolo) | PascalCase | `GoalProgressCard.tsx` |
| Página | `XxxPage.tsx` | `DashboardPage.tsx` |
| Hook | `useXxx.ts` camelCase | `useDashboardMetrics.ts` |
| Service | `dominio.service.ts` | `creditCards.service.ts` |
| Util pura | camelCase | `money.ts`, `interestCompound.ts` |
| Tipo / interface | PascalCase, **sin** prefijo `I` | `Transaction`, `CreditCard` |
| Esquema Zod | `xxxSchema` | `transactionSchema` |
| Constante | UPPER_SNAKE_CASE | `SCHEMA_VERSION`, `DEFAULT_CURRENCY` |
| Tabla Dexie | plural camelCase | `transactions`, `creditCards` |
| Rutas | kebab-case | `/emergency-fund` |
| Test | `xxx.test.ts(x)` colocalizado | `money.test.ts` |

---

## 16. Convenciones de TypeScript

- `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` +
  `noImplicitReturns`. Ver `tsconfig` propuesto en [`decisions.md`](./decisions.md) ADR-0003.
- **Sin `any`.** `unknown` + narrowing donde haga falta. `as` solo en fronteras justificadas.
- **Tipos inferidos de Zod** (`z.infer<typeof schema>`) como fuente de verdad; no duplicar
  interfaces a mano.
- **Branded types** para valores que no deben mezclarse: `Cents`, `IsoDate`, y IDs por
  entidad (`TransactionId`, `GoalId`…).
- **Uniones discriminadas** en lugar de `enum` de TS (mejor _tree-shaking_ y _narrowing_):
  `type TxType = 'income' | 'expense'`; objetos `as const` para catálogos.
- **Path aliases** (`@/…`) configurados en `tsconfig` + Vite para imports limpios.
- Funciones de dominio **puras y tipadas de retorno explícito** en `services`/`lib/calc`.

---

## 17. Calidad, DX y scripts

- `npm run dev` / `build` / `preview`, `typecheck`, `lint`, `format`, `test`, `test:watch`.
- **husky + lint-staged**: pre-commit corre `eslint --fix` + `prettier` + `tsc --noEmit`.
- **Prettier** + `prettier-plugin-tailwindcss` (ordena clases).
- CI (fase posterior, opcional): typecheck + lint + test en GitHub Actions.

El objetivo operativo del usuario se cumple: **clonar → `npm install` → `npm run dev`**.

---

## 18. Qué queda explícitamente FUERA (v1)

Backend, autenticación, multiusuario, sincronización en la nube, notificaciones push del
sistema. Todo ello está _previsto_ por la arquitectura (la capa `services` es el punto de
extensión), pero no se implementa en la primera versión, según requisito.

---

_Ver el registro de decisiones formales en [`decisions.md`](./decisions.md) y el plan de
entrega por fases en [`roadmap.md`](./roadmap.md)._
