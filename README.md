# FinPilot

**Centro de control financiero personal** — offline-first, instalable como PWA en Windows y
Android. Sin backend, sin autenticación: todos tus datos viven localmente en tu navegador
(IndexedDB). Presupuestos, ahorros, metas, tarjetas de crédito, patrimonio e inteligencia
financiera en una interfaz moderna, rápida y con modo claro/oscuro.

> Estado: **Todas las fases (0–12) completadas** — proyecto listo para usar. Dashboard, movimientos,
> tarjetas, metas, fondo de emergencia, presupuestos, estadísticas, simulador/proyecciones,
> inteligencia financiera, exportación/respaldos, configuración editable y cobertura de tests
> (61). Ver [`docs/roadmap.md`](docs/roadmap.md).

---

## Tecnologías

React 18 · TypeScript (strict) · Vite 5 · Tailwind CSS · shadcn/ui · Dexie (IndexedDB) ·
React Router · React Hook Form + Zod · Zustand · Chart.js · SheetJS + jsPDF (export) ·
vite-plugin-pwa · date-fns.

Detalle y justificación de cada elección en [`docs/architecture.md`](docs/architecture.md) y
[`docs/decisions.md`](docs/decisions.md).

## Requisitos

- **Node.js ≥ 18** (recomendado 20+).
- npm ≥ 9.

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre la URL que muestra la terminal (por defecto `http://localhost:5173`).

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR. |
| `npm run build` | Compila TypeScript y genera el build de producción. |
| `npm run preview` | Sirve el build de producción localmente. |
| `npm run typecheck` | Verificación de tipos sin emitir. |
| `npm run lint` | Analiza el código con ESLint. |
| `npm run lint:fix` | ESLint con autocorrección. |
| `npm run format` | Formatea el código con Prettier. |
| `npm run test` | Ejecuta las pruebas (Vitest). |
| `npm run test:watch` | Pruebas en modo watch. |

## Instalar como aplicación (PWA)

Tras `npm run build` y `npm run preview` (o en producción), el navegador (Edge/Chrome en
Windows, Chrome en Android) ofrecerá **Instalar FinPilot**. Una vez instalada, funciona sin
conexión y se abre como una app nativa.

## Estructura del proyecto

```
src/
├── app/          Shell: App, router, providers, layouts
├── features/     Módulos de dominio (dashboard, income, expenses, …)
├── components/   UI compartida (ui = shadcn, common = compuestos)
├── db/           Dexie: base de datos, esquema, sembrado
├── services/     Lógica de dominio y acceso a datos
├── hooks/        Hooks compartidos
├── context/      Contextos globales (tema, settings)
├── lib/          Utilidades puras (money, date, format, errors)
├── types/        Tipos globales y branded types
├── constants/    Constantes (rutas, categorías, config)
└── styles/       Tailwind + tokens de tema
```

Arquitectura completa en [`docs/architecture.md`](docs/architecture.md).

## Documentación

- [`docs/architecture.md`](docs/architecture.md) — Arquitectura y decisiones técnicas.
- [`docs/database.md`](docs/database.md) — Modelo de datos (IndexedDB/Dexie).
- [`docs/features.md`](docs/features.md) — Catálogo funcional.
- [`docs/decisions.md`](docs/decisions.md) — Registro de decisiones (ADR).
- [`docs/roadmap.md`](docs/roadmap.md) — Plan de implementación por fases.
- [`docs/changelog.md`](docs/changelog.md) — Historial de cambios.

## Privacidad

FinPilot **no envía datos a ningún servidor**. Toda tu información permanece en tu dispositivo.
Usa la exportación de respaldo (Configuración → Datos y respaldos) para mover o resguardar tus datos.

## Licencia

MIT.
