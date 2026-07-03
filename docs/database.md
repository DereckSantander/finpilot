# FinPilot — Base de datos (IndexedDB + Dexie)

> Estado: **PROPUESTA — pendiente de aprobación**. Última actualización: 2026-07-02.
> Modelo de datos, tablas, índices, relaciones, migraciones y respaldo.

La persistencia es la **fuente de la verdad** de la aplicación. Se usa **IndexedDB** a través
de **Dexie**. Este documento define el esquema `SCHEMA_VERSION = 1`.

---

## 1. Convenciones del modelo

- **Dinero → enteros en centavos.** Todo campo monetario es `Cents` (`number` entero, la
  moneda mínima). Formateo solo en presentación. Ver [`architecture.md`](./architecture.md) §16 y ADR-0004.
- **IDs → `string` (nanoid).** Clave primaria `id` en cada tabla, no autoincremental, para
  que los respaldos sean portables y estables entre dispositivos.
- **Fechas:** se almacenan como **ISO 8601 string** (`IsoDate`/`IsoDateTime`) en UTC. Para
  índices por mes se guarda además un campo derivado `yearMonth` (`"YYYY-MM"`) cuando se
  necesita agrupar rápido.
- **Auditoría:** toda entidad lleva `createdAt` y `updatedAt` (`IsoDateTime`).
- **Borrado:** borrado físico por defecto; entidades sensibles a histórico
  (`transactions`) pueden usar `deletedAt` (soft-delete) en fase 2 si se requiere papelera.
- **Enums → uniones de strings** (`as const`), no enums TS.

Tipos base (en `src/types/`):

```ts
type Cents = number & { readonly __brand: 'Cents' };      // 12345 => 123.45
type IsoDate = string & { readonly __brand: 'IsoDate' };    // "2026-07-02"
type IsoDateTime = string & { readonly __brand: 'IsoDateTime' };
type YearMonth = string;                                     // "2026-07"
```

---

## 2. Tablas (object stores) y esquema de índices

Declaración Dexie (índices; `id` es PK; `&` único; `*` multi-entry; `[a+b]` compuesto):

```ts
this.version(1).stores({
  settings:            'id',                                   // fila única 'app'
  categories:          'id, type, name, isArchived',
  paymentMethods:      'id, type, isArchived',
  transactions:        'id, type, date, yearMonth, categoryId, paymentMethodId, creditCardId, [type+yearMonth]',
  tags:                'id, &name',
  attachments:         'id, transactionId',
  creditCards:         'id, isArchived',
  creditCardStatements:'id, creditCardId, yearMonth, [creditCardId+yearMonth]',
  creditCardPayments:  'id, creditCardId, statementId, date',
  goals:               'id, priority, targetDate, isArchived, isEmergencyFund',
  goalContributions:   'id, goalId, date',
  budgets:             'id, yearMonth, categoryId, [yearMonth+categoryId]',
  depositScenarios:    'id, createdAt',
  netWorthSnapshots:   'id, date',
  reminders:           'id, dueDate, isDone',
  backups:             'id, createdAt',
});
```

---

## 3. Definición de entidades

### 3.1 `settings` (configuración global — fila única `id: 'app'`)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `'app'` | Singleton |
| currency | `string` | ISO 4217, def. `'USD'` |
| locale | `'es' \| 'en'` | def. `'es'` |
| theme | `'light' \| 'dark' \| 'system'` | def. `'system'` |
| startOfMonth | `number` | día de inicio de ciclo (def. 1) |
| monthlySavingsTarget | `Cents` | meta de ahorro mensual (≈300 USD) |
| emergencyFund | `{ targetMonths: number[]; linkedGoalId?: string }` | def. `[3,6,12]` |
| autoBackup | `{ enabled: boolean; frequencyDays: number; keep: number }` | política de respaldo |
| createdAt / updatedAt | `IsoDateTime` | |

### 3.2 `categories`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| name | `string` | |
| type | `'income' \| 'expense'` | |
| color | `string` | token/HEX para gráficos |
| icon | `string` | nombre de icono lucide |
| isSystem | `boolean` | semilla no borrable (sí editable) |
| isArchived | `boolean` | oculta sin romper históricos |
| sortOrder | `number` | |
| createdAt / updatedAt | `IsoDateTime` | |

Semillas de gasto: Transporte, Alimentación, Celular, Tarjeta de crédito, Novia, Compras,
Entretenimiento, Salud, Viajes, Otros. Semillas de ingreso: Sueldo, Bonificaciones,
Ingresos extra, Otros.

### 3.3 `paymentMethods`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| name | `string` | "Efectivo", "Transferencia", "Tarjeta X"… |
| type | `'cash' \| 'debit' \| 'credit' \| 'transfer' \| 'other'` | |
| creditCardId | `string?` | si `type==='credit'`, vincula a la tarjeta |
| isArchived | `boolean` | |
| createdAt / updatedAt | `IsoDateTime` | |

### 3.4 `transactions` (ingresos y gastos unificados) — ver ADR-0005

Tabla única con discriminador `type`. Simplifica estadísticas, patrimonio y balance.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| type | `'income' \| 'expense'` | |
| amount | `Cents` | siempre positivo; el signo lo da `type` |
| date | `IsoDate` | fecha del movimiento |
| time | `string?` | `"HH:mm"` (los gastos guardan hora) |
| yearMonth | `YearMonth` | derivado de `date`, para índices/agrupado |
| categoryId | `string` | FK → categories |
| paymentMethodId | `string?` | FK → paymentMethods |
| creditCardId | `string?` | FK → creditCards (si se cargó a tarjeta) |
| description | `string` | |
| notes | `string?` | |
| tags | `string[]` | nombres de etiqueta (multi-entry vía join opcional) |
| attachmentId | `string?` | FK → attachments (comprobante) |
| createdAt / updatedAt | `IsoDateTime` | |

> El _quick-add_ de gasto (<5 s) solo exige `amount` + `categoryId`; el resto tiene
> _defaults_ (fecha/hora = ahora, método = último usado).

### 3.5 `tags`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| name | `string` (único) | para autocompletado |
| createdAt | `IsoDateTime` | |

### 3.6 `attachments` (comprobantes)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| transactionId | `string` | FK inversa |
| blob | `Blob` | imagen del comprobante |
| mimeType | `string` | |
| sizeBytes | `number` | para control de cuota |
| createdAt | `IsoDateTime` | |

> Se guardan en tabla aparte para no inflar las lecturas de `transactions`.

### 3.7 `creditCards`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| name | `string` | alias |
| bank | `string` | |
| creditLimit | `Cents` | cupo |
| cutoffDay | `number` | día de corte (1–31) |
| paymentDueDay | `number` | día máximo de pago |
| color | `string` | para UI |
| isArchived | `boolean` | |
| createdAt / updatedAt | `IsoDateTime` | |

> **Consumo actual, pago mínimo y utilización se derivan** de `transactions` +
> `creditCardStatements`, no se guardan como campo mutable suelto (evita desincronización).

### 3.8 `creditCardStatements` (corte mensual / historial)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| creditCardId | `string` | FK |
| yearMonth | `YearMonth` | periodo del corte |
| cutoffDate / dueDate | `IsoDate` | fechas de ese ciclo |
| statementBalance | `Cents` | consumo del periodo |
| minimumPayment | `Cents` | pago mínimo |
| paidAmount | `Cents` | agregado de pagos (derivable de payments) |
| status | `'open' \| 'paid' \| 'partial' \| 'overdue'` | |
| createdAt / updatedAt | `IsoDateTime` | |

### 3.9 `creditCardPayments`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| creditCardId | `string` | FK |
| statementId | `string?` | FK al corte pagado |
| amount | `Cents` | |
| date | `IsoDate` | |
| createdAt | `IsoDateTime` | |

### 3.10 `goals` (metas, incluye fondo de emergencia)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| name | `string` | Carro, Fondo de emergencia, Viaje… |
| targetAmount | `Cents` | objetivo |
| targetDate | `IsoDate?` | fecha meta |
| priority | `'low' \| 'medium' \| 'high'` | |
| color / icon | `string` | |
| isEmergencyFund | `boolean` | marca la meta especial de fondo de emergencia |
| isArchived | `boolean` | |
| createdAt / updatedAt | `IsoDateTime` | |

> `savedAmount` y `%` se **derivan** de `goalContributions` (suma). El fondo de emergencia se
> modela como una meta con `isEmergencyFund: true`, y su cobertura en meses la calcula
> `emergencyFund.service` usando el gasto medio mensual.

### 3.11 `goalContributions`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| goalId | `string` | FK |
| amount | `Cents` | aporte (puede ser negativo = retiro) |
| date | `IsoDate` | |
| note | `string?` | |
| createdAt | `IsoDateTime` | |

### 3.12 `budgets` (presupuesto mensual)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| yearMonth | `YearMonth` | mes presupuestado |
| categoryId | `string?` | `null` = presupuesto global del mes |
| amount | `Cents` | límite |
| createdAt / updatedAt | `IsoDateTime` | |

> Gastado, disponible y proyección de fin de mes se **derivan** de `transactions`.

### 3.13 `depositScenarios` (pólizas / simulador plazo fijo)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| name | `string` | etiqueta del escenario |
| principal | `Cents` | capital |
| annualRate | `number` | interés anual (decimal, p. ej. 0.085) |
| termMonths | `number` | plazo |
| compounding | `'monthly' \| 'quarterly' \| 'semiannual' \| 'annual' \| 'atMaturity'` | periodicidad |
| createdAt / updatedAt | `IsoDateTime` | |

> Intereses, monto final y rentabilidad se **calculan** (no se guardan); se persiste solo la
> entrada para comparar escenarios.

### 3.14 `netWorthSnapshots` (evolución del patrimonio)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| date | `IsoDate` | punto en el tiempo |
| assets | `Cents` | disponible + ahorros + metas |
| liabilities | `Cents` | deuda de tarjetas |
| netWorth | `Cents` | assets − liabilities |
| createdAt | `IsoDateTime` | |

> El patrimonio "en vivo" se calcula al vuelo; los _snapshots_ existen para dibujar la
> **serie histórica** (un cálculo retroactivo no siempre es posible si faltan datos).

### 3.15 `reminders`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| title | `string` | "Pagar tarjeta X" |
| dueDate | `IsoDate` | |
| relatedType | `'creditCard' \| 'goal' \| 'custom'` | |
| relatedId | `string?` | |
| isDone | `boolean` | |
| createdAt / updatedAt | `IsoDateTime` | |

### 3.16 `backups` (auto-respaldo local)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `string` | |
| createdAt | `IsoDateTime` | |
| schemaVersion | `number` | |
| sizeBytes | `number` | |
| payload | `Blob` | JSON serializado (gzip en fase 2) |

---

## 4. Relaciones (diagrama lógico)

```
settings (1) ──────────────────────────────── (singleton)

categories (1) ──< transactions (N)
paymentMethods (1) ──< transactions (N)
paymentMethods (N) >── (0..1) creditCards          # método "credit" apunta a una tarjeta

creditCards (1) ──< creditCardStatements (N)
creditCards (1) ──< creditCardPayments (N)
creditCardStatements (1) ──< creditCardPayments (N)
creditCards (1) ──< transactions (N)               # gastos cargados a la tarjeta

transactions (1) ──── (0..1) attachments
transactions (N) >──< tags (N)                     # etiquetas por nombre

goals (1) ──< goalContributions (N)
goals (0..1) ──── settings.emergencyFund.linkedGoalId

budgets (N) >── (0..1) categories                  # null = presupuesto global del mes
```

Integridad referencial: IndexedDB no la impone; la garantizan los **services** (al borrar una
categoría se impide si tiene transacciones, o se reasigna a "Otros"; al borrar una tarjeta se
archivan sus movimientos, etc.). Reglas concretas en [`features.md`](./features.md).

---

## 5. Datos derivados (nunca almacenados como verdad)

| Métrica | Fórmula (fuente) |
|---------|------------------|
| Gastos del mes | Σ `transactions.amount` where `type='expense'` and `yearMonth` |
| Ingresos del mes | Σ where `type='income'` |
| Balance mensual | ingresos − gastos |
| % de ahorro | `(ingresos − gastos) / ingresos` |
| Total ahorrado | Σ `goalContributions.amount` (todas las metas) |
| Dinero disponible | ingresos acumulados − gastos − aportes a metas (según modelo de caja) |
| Deuda de tarjetas | Σ `statementBalance` abiertos − pagos |
| Utilización de cupo | consumo actual / `creditLimit` |
| Patrimonio total | disponible + ahorros − deuda |
| Cobertura fondo emerg. | `savedAmount(emergencyFund) / gastoMedioMensual` |

---

## 6. Migraciones

- Cada cambio de esquema incrementa `this.version(n)` en Dexie con su `.upgrade(tx => …)`.
- `SCHEMA_VERSION` (constante) se incluye en cada **respaldo**; la importación compara y
  aplica transformaciones si el respaldo es de una versión anterior.
- Regla: las migraciones son **aditivas y no destructivas** siempre que sea posible; una
  migración destructiva exige respaldo automático previo.
- Historial de versiones de esquema se registra en [`changelog.md`](./changelog.md).

---

## 7. Estrategia de respaldo (detalle técnico)

- **Export completo:** `backup.service.exportAll()` → objeto `{ schemaVersion, exportedAt,
  tables: { … } }`; los `Blob` de adjuntos se codifican base64. Se descarga como
  `finpilot-backup-YYYYMMDD-HHmm.json`.
- **Import:** parseo Zod del archivo → validación de `schemaVersion` → migración si aplica →
  restauración transaccional (`db.transaction('rw', …)`), con opción "reemplazar" o "fusionar".
- **Auto-backup:** un efecto al iniciar sesión comprueba `autoBackup`; si toca, genera un
  `backups` row y aplica retención (`keep`).
- **Cuota:** antes de escribir adjuntos grandes se consulta `navigator.storage.estimate()`.

---

## 8. Rendimiento

- Índices compuestos (`[type+yearMonth]`, `[yearMonth+categoryId]`,
  `[creditCardId+yearMonth]`) para las consultas más frecuentes (dashboard, presupuesto,
  cortes) sin escaneo completo.
- `useLiveQuery` cachea y recomputa solo cuando cambian las tablas involucradas.
- Adjuntos (Blobs) siempre en tabla aparte para no penalizar listados.
- Paginación/virtualización de listas largas de transacciones (fase 2 si hace falta).
