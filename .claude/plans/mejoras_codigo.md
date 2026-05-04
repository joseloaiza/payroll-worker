# Code Review: PayrollService y servicios relacionados

## Contexto

Revisión técnica profunda de `PayrollService` y sus servicios dependientes. El objetivo es identificar problemas reales de seguridad, rendimiento, legibilidad y testeabilidad, con sugerencias concretas y accionables.

---

## 🔴 Problemas críticos

### 1. `rawPeriod: any` — pérdida total de tipos en el punto de entrada
**Archivos:** `payroll.service.ts:63`, `payroll.service.ts:153`

```ts
// Actual
async calculate(employeeId: string, companyId: string, rawPeriod: any)
private async buildPayrollContext(..., period: any): Promise<PayrollContext>
```

El tipo `any` propaga silenciosamente datos mal formados. Si `rawPeriod.initialDate` llega como `string` en lugar de `Date`, el cálculo continúa sin error hasta que falla de forma opaca más adelante.

**Solución:** Definir un DTO con validación:
```ts
export interface RawPeriodInput {
  id: string;
  initialDate: string;   // ISO string, se convierte a Date
  endDate: string;
  number: number | null;
  previousPeriodYear: number;
  previousPeriodNumber: number;
  company_id: string;
  periodStatus_id: string;
  isActive: boolean;
}
```

---

### 2. N llamadas a BD para resolver códigos de concepto en `calculateAbsentees`
**Archivo:** `payroll.service.ts:486-493`

```ts
const codeIdPairs = await Promise.all(
  allCodes.map(async (code) => {
    const codeId = await this.codesConfigService.getCodeById(code);  // ~20 round-trips
    return [code, conceptsMap.get(codeId)] as const;
  }),
);
```

Con `diseaseMappings` (11 entradas) + `licenseMappings` (5 entradas) = **16 queries a BD por empleado por nómina**. Multiplicado por 100 empleados = 1.600 queries solo para mapear códigos de concepto.

**Solución:** Pre-cargar todos los códigos de ausentismo una sola vez al inicio de `calculate()` y pasarlos como parámetro, o usar el caché Redis que ya está configurado en el proyecto.

---

### 3. `getConceptCodes` se llama múltiples veces por cálculo
**Archivos:** `payroll.service.ts` — múltiples métodos

Cada método privado llama a `getConceptCodes` independientemente:
- `calculateProvisions` → `getConceptCodes(CONCEPT_IDS_REGIME)`
- `calculateVacationsProvisions` → `getConceptCodes(CONCEPT_IDS_REGIME)` ← **duplicado**
- `calculateSalary` → `getConceptCodes(CONCEPT_IDS_SALARY)`
- `calculateExcess1393` → `getConceptCodes(CONCEPT_IDS_EXCESS1393)`
- `calculateTransportAssistance` → `getConceptCodes(CONCEPT_IDS_TRANSPORT)`

Son queries a BD que se repiten con los mismos datos por cada cálculo de empleado.

**Solución:** Resolver todos los códigos necesarios una sola vez en `calculate()` y pasarlos como contexto inmutable. O implementar memoización con TTL corto dado que ya se tiene Redis.

---

### 4. Código muerto comentado en `payrollHelpers.ts`
**Archivo:** `src/payroll/helpers/payrollHelpers.ts:57-89`

Existe una implementación alternativa comentada de `calculateWorkedDays`. Esto confunde a futuros desarrolladores y sugiere que la lógica actual no fue del todo validada.

**Solución:** Eliminar el bloque comentado. El historial de git preserva la versión anterior.

---

## 🟠 Problemas de diseño / mantenibilidad

### 5. `PayrollService` tiene 12 dependencias inyectadas — violación de SRP

```ts
constructor(
  private readonly employeeService: EmployeeService,
  private readonly conceptService: ConceptsService,
  private readonly movementService: MovementsService,
  private readonly absenteeismService: AbsenteeismService,
  private readonly recurrentPaymentService: RecurrentPaymentService,
  private readonly socialSecurityService: SocialSecurityService,
  private readonly unemploymentService: UnemploymentService,
  private readonly bonusPaymentService: BonusPaymentService,
  private readonly codesConfigService: CodesConfigService,
  private readonly payrollConstantsService: PayrollConstantsService,
  private readonly vacationsService: VacationsService,
  private readonly snapshotService: SnapshotService,
)
```

Un constructor con 12 dependencias es una señal clara de que la clase hace demasiado. Actualmente `PayrollService` cumple tres roles distintos: **orquestador** (coordina el flujo), **calculador de salario** y **calculador de transporte**. Esto impide testear partes individuales sin mockear todas las dependencias.

**Solución recomendada:** Extraer `SalaryService` y `TransportService` con los métodos `calculateSalary` y `calculateTransportAssistance/calculateTransportBase`. `PayrollService` quedaría como puro orquestador con 6-7 dependencias.

---

### 6. `realEndDatePeriod` se calcula pero nunca se aplica
**Archivo:** `payroll.service.ts:171-172`

```ts
const realEndDatePeriod = getRealEndDatePeriod(period.endDate);
//period.endDate = realEndDatePeriod;   // ← comentado, intención sin terminar
```

`realEndDatePeriod` se guarda en `context.realEndDatePeriod` pero ningún servicio lo usa en los cálculos. O esta lógica es necesaria (y está rota porque está comentada), o es código muerto.

**Acción:** Definir claramente si `period.endDate` debe reemplazarse con `realEndDatePeriod` antes de los cálculos. Si sí, descomentar y activar. Si no, eliminar el campo del contexto.

---

### 7. Mutación directa del contexto dispersa en múltiples métodos

```ts
context.totalAbseenteDays = totalAbsenteeDays;  // en calculateAbsentees
context.excess1393 = excess1393;               // en calculateExcess1393
context.rawSalary = valueSalary;               // en calculateSalary
context.ibcSocialSecurity = IBCSSP;            // en calculateSocialSecurity
context.totalBaseCree = totalBaseCree;         // en calculateExcess1393
```

Los efectos secundarios esparcidos hacen muy difícil entender qué tiene el contexto en cada punto del flujo, y hacen imposible testear métodos privados en aislamiento.

**Solución:** Los métodos que necesitan retornar datos calculados deberían retornarlos explícitamente en lugar de mutar el contexto. Ejemplo:

```ts
// Actual
private async calculateSalary(context, conceptsMap): Promise<Movement[]> {
  // ...
  context.rawSalary = valueSalary; // mutación oculta
  return successes;
}

// Mejor
private async calculateSalary(context, conceptsMap): Promise<{ movements: Movement[]; rawSalary: number }> {
  // ...
  return { movements: successes, rawSalary: valueSalary };
}
```

---

### 8. Validación de contrato vigente: dos bugs superpuestos
**Archivo:** `payroll.service.ts:174-193`

El bloque actual tiene **dos problemas independientes**:

#### Bug A — La validación `!contractsInperiod` nunca dispara
TypeORM `.getMany()` **nunca retorna `null`** — retorna `[]` cuando no hay resultados. Por lo tanto el guard actual es inerte:

```ts
if (!contractsInperiod)  // ← ![] === false siempre → el error nunca se lanza
```

Si un empleado no tiene contratos en el período, `contractsInperiod = []`, el cálculo continúa y falla de forma opaca más adelante.

#### Bug B — `getContractsEmployee` es redundante y tampoco valida correctamente
```ts
const contracts = await this.employeeService.getContractsEmployee(employeeId);
if (!contracts) { ... }  // mismo bug: ![] === false
// `contracts` no se usa después en ningún lado
```

`getContractsEmployee` trae **todos** los contratos del empleado sin ningún filtro de fecha ni de `isActive`. Un empleado con contratos todos vencidos hace 5 años pasaría esta validación sin problema.

#### La solución: usar `contractsInperiod` con la condición correcta

`findContractsInPeriod` ya ejecuta exactamente la validación de negocio correcta:
```sql
WHERE employee_id = :id
  AND initialContractDate <= :periodEnd
  AND (endContractDate IS NULL OR endContractDate >= :periodStart)
```
Si retorna filas → el empleado tiene un contrato vigente en el período. Es suficiente.

**Código propuesto** (`payroll.service.ts`):
```ts
// ELIMINAR completamente (líneas 188-193):
const contracts = await this.employeeService.getContractsEmployee(employeeId);
if (!contracts) {
  throw new PayrollValidationError('Empleado no tiene datos de contrato');
}

// CORREGIR la validación existente (línea 180):
// Antes:
if (!contractsInperiod)
// Después:
if (!contractsInperiod || contractsInperiod.length === 0)
```

**Resultado:** 1 query a BD eliminada por empleado, y la validación de contrato vigente pasa a funcionar realmente.

---

### 9. `calculateVacationsProvisions` no usa el buffer `calculateMovements`
**Archivo:** `payroll.service.ts:415-443`

```ts
private async calculateVacationsProvisions(context, conceptsMap, calculateMovements) {
  // ...
  await this.movementService.saveMovements(enjoyedMovements);      // save directo
  await this.movementService.saveMovements(vacationsProvisionsMovements); // save directo
  calculateMovements.clearMovements();  // limpia un buffer que nunca se llenó
}
```

El parámetro `calculateMovements` se pasa pero se ignora. Se hace `clearMovements()` sobre un buffer vacío. Inconsistente con el patrón del resto del servicio.

---

### 10. Tipado débil en `buildMovementData`
**Archivo:** `src/payroll/helpers/payrollHelpers.ts:5`

```ts
export function buildMovementData(
  source: Record<string, any>,   // ← any pierde seguridad
  ...
)
```

**Solución:** Usar genérico:
```ts
export function buildMovementData<T extends Record<string, unknown>>(
  source: T,
  mappings: MappingConfig[],
  codeToConceptId: Map<string, string>,
)
```

---

## 🟡 Problemas de calidad / legibilidad

### 11. Typos en campos de `PayrollContext` propagados por todo el código
**Archivo:** `src/payroll/interfaces/payroll.interfaces.ts:32-33`

```ts
totalWorkindays: number;    // debería ser totalWorkingDays
totalAbseenteDays: number;  // debería ser totalAbsenteeDays
```

Estos typos están en la interfaz, el servicio y la lógica de negocio. Corregirlos requiere un rename coordinado pero mejora la legibilidad significativamente.

---

### 12. `variableSalary` duplicado en `PayrollContext`
**Archivo:** `src/payroll/interfaces/payroll.interfaces.ts:39-52`

```ts
salaryData: {
  variableSalary: boolean;  // duplicado
};
contractData: {
  variableSalary: boolean;  // duplicado
};
```

Un solo valor duplicado en dos subcontextos. Cualquier acceso a `context.salaryData.variableSalary` podría inconsistentemente usar el otro.

---

### 13. Magic strings para códigos de concepto sin constante
**Archivo:** `payroll.service.ts:511-513`

```ts
conceptsMap.get(await this.codesConfigService.getCodeById('0007'))
```

**Archivo:** `payroll.service.ts:768-769`

```ts
const concepId = conceptsMap.get(await this.codesConfigService.getCodeById('0081'));
```

`'0007'` es el código de días de ausentismo total y `'0081'` es la base de transporte. Ambos ya existen en `constants/constants.ts` pero no se están usando:
- `'0007'` no tiene constante (falta agregar)
- `'0081'` = `CONCEPT_IDS_TRANSPORT.transportBase`

---

### 14. Códigos duplicados entre `payroll.interfaces.ts` y `constants/constants.ts`
`CODES_CONFIG` en `payroll.interfaces.ts:146` y `CONCEPT_IDS_UNEMPLOYMENT` en `constants/constants.ts` tienen los mismos valores. Dos fuentes de verdad para los mismos datos.

---

### 15. Inconsistencia en manejo de errores

Algunos métodos lanzan `PayrollCalculationError` (tipo específico), otros lanzan `Error` genérico:

```ts
// calculateSalary
throw new PayrollCalculationError(`No se pudo calcular el salario...`);

// calculateTransportBase
throw new Error(`No se pudo calcular la base para el transporte...`);

// calculateVacationsEnjoyed
throw new Error(`No se pudo calcular los días de vacaciones disfrutadas...`);
```

El `calculate()` principal captura todo con `error instanceof Error`, borrando la distinción entre errores de validación y errores de cálculo.

---

### 16. Comparación de fechas con operador `>` en `VacationsService`
**Archivo:** `vacations.service.ts:222-225`

```ts
const fechaInicioLiquidacion =
  absence.initialAbsencesDate > period.initialDate
    ? absence.initialAbsencesDate
    : period.initialDate;
```

Aunque funciona en JavaScript, comparar `Date` con `>` es menos explícito que `isAfter()` de `date-fns`, que es la librería ya usada en el proyecto.

---

## 🧪 Estructuración para pruebas unitarias

### 17. Problema central: orquestador con lógica de negocio no es testeable

El patrón actual mezcla coordinación y cálculo en `PayrollService`, haciendo que:
- Un test unitario de `calculateSalary` requiera mockear 12 dependencias
- Los efectos secundarios sobre `context` sean invisibles en el retorno del método
- No se pueda testear el flujo de orquestación sin ejecutar toda la lógica

**Estructura recomendada para máxima testeabilidad:**

```
PayrollOrchestrator (actual PayrollService)
  - Solo coordina, no calcula
  - Recibe resultados intermedios, los pasa al siguiente paso

SalaryCalculator          ← lógica pura de cálculo de salario
TransportCalculator       ← lógica de transporte
Excess1393Calculator      ← lógica de ley 1393

VacationsService          ← ya existe, bien separado
UnemploymentService       ← ya existe, bien separado
SocialSecurityService     ← ya existe, bien separado
```

**Ejemplo de test unitario con la estructura propuesta:**

```ts
// Fácil de testear porque SalaryCalculator tiene ~3 dependencias
describe('SalaryCalculator', () => {
  it('should return 0 salary when all days are absences', async () => {
    const context = buildMockContext({ totalAbsenteeDays: 30 });
    const result = await calculator.calculate(context, mockConceptsMap);
    expect(result.rawSalary).toBe(0);
  });
});
```

### 18. `PayrollContext` debería tener un factory/builder para tests

Actualmente construir un `PayrollContext` válido para tests requiere poblar ~15 campos. Un builder facilita enormemente los tests:

```ts
// test/builders/payroll-context.builder.ts
export function buildMockContext(overrides?: Partial<PayrollContext>): PayrollContext {
  return {
    employeeId: 'emp-123',
    companyId: 'comp-456',
    period: buildMockPeriod(),
    totalWorkindays: 30,
    totalAbseenteDays: 0,
    rawSalary: 0,
    excess1393: 0,
    totalBaseCree: 0,
    ibcSocialSecurity: 0,
    vacationHistory: 0,
    salaryData: { salary: 1_300_000, salaryTypeCode: 'ORD', variableSalary: false },
    contractData: { /* ... */ },
    realEndDatePeriod: new Date('2025-01-31'),
    employeeContext: buildMockEmployee(),
    ...overrides,
  };
}
```

---

## Resumen priorizado

| Prioridad | Item | Impacto |
|-----------|------|---------|
| 🔴 Alta | #2 — N queries por empleado en `calculateAbsentees` | Rendimiento |
| 🔴 Alta | #3 — `getConceptCodes` repetido por cálculo | Rendimiento |
| 🔴 Alta | #1 — `rawPeriod: any` en punto de entrada | Seguridad de tipos |
| 🟠 Media | #5 — 12 dependencias, extraer `SalaryService`/`TransportService` | Testeabilidad |
| 🟠 Media | #7 — Mutación oculta del contexto | Testeabilidad / Mantenibilidad |
| 🟠 Media | #8 — Query innecesaria a `getContractsEmployee` | Rendimiento |
| 🟠 Media | #6 — `realEndDatePeriod` sin usar / comportamiento indefinido | Correctitud |
| 🟡 Normal | #11 — Typos en interfaz `PayrollContext` | Legibilidad |
| 🟡 Normal | #13 — Magic strings sin constante | Legibilidad |
| 🟡 Normal | #15 — Inconsistencia en tipos de error | Robustez |
| 🟡 Normal | #4 — Código comentado en helpers | Limpieza |
| 🟡 Normal | #18 — Builder de contexto para tests | Testeabilidad |
