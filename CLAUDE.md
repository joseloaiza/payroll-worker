# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev         # Watch mode (recommended for development)
npm run start:debug       # Debug mode with node inspector

# Build & Quality
npm run build             # Compile TypeScript to dist/
npm run lint              # ESLint with auto-fix
npm run format            # Prettier formatting

# Testing
npm run test              # Run unit tests
npm run test:watch        # Watch mode
npm run test:cov          # Coverage report
npm run test:e2e          # End-to-end tests

# Run a single test file
npx jest src/payroll/payroll.service.spec.ts
```

## Architecture

This is a **NestJS microservice worker** that processes payroll calculations asynchronously via Azure Service Bus message queues.

### Message Flow

```
Azure Service Bus (payroll-jobs queue)
  → PayrollProcessor (message listener/controller)
    → PayrollService.calculate()
      → EmployeeService, ConceptsService, MovementsService
      → AbsenteeismService, RecurrentPaymentService
      → SocialSecurityService
      → ProvisionsService (vacations, unemployment, bonus)
      → SnapshotService (saves audit snapshot per employee)
      → Updates Period/Job status in PostgreSQL
```

### Key Modules

| Module | Role |
|--------|------|
| `payroll/` | Core engine: processor, service, context, helpers, period, scheduler, jobs |
| `employee/` | Employee & contract data |
| `movements/` | Salary adjustments |
| `novelties/` | Absenteeism + recurrent payments |
| `provisions/` | Vacations, unemployment fund, bonus payments |
| `social-security/` | Social security deductions |
| `company/` | Company config, payment frequency |
| `snapshot/` | Saves pre/post calculation snapshots per employee |
| `messaging/` | Abstraction over Azure Service Bus / RabbitMQ |
| `config/` | Code mappings (`codes-config`) and payroll constants |

### Payroll Calculation Context

`payroll/context/payroll-context.ts` holds the calculation state passed through the pipeline. `payroll/helpers/payrollHelpers.ts` contains shared utilities (e.g., `calculateWorkedDays`, `buildMovementData`).

The scheduler (`payroll/scheduler/`) runs a cron job (configurable via `PAYROLL_SCHEDULE_CRON`) that enqueues payroll jobs automatically when `EXECUTE_PAYROLL_CRON=true`.

### Messaging

`messaging/messaging.factory.ts` selects between Azure Service Bus (`servicebus.client.ts`) and RabbitMQ (`rabbitmq.client.ts`) based on the `MESSAGING_PROVIDER` env var. Default is `servicebus`.

### External Services

- **PostgreSQL** (Azure) — TypeORM with `synchronize: false` (manual migrations)
- **Redis** (Azure) — Global cache via `@nestjs/cache-manager` + ioredis
- **Azure Service Bus** — Three queues: `SERVICEBUS_QUEUE`, `SERVICEBUS_PAYROLL_JOBS_QUEUE`, `SERVICEBUS_PAYROLL_STATUS_QUEUE`
- **Logging** — Winston with daily file rotation to `/logs`

### Environment

Key env vars (see `.env` for full list):
- `MESSAGING_PROVIDER` — `servicebus` or `rabbitmq`
- `EXECUTE_PAYROLL_CRON` — `true`/`false` to enable scheduler
- `PAYROLL_SCHEDULE_CRON` — cron expression (default: `0 */5 * * * *`)
- `TZ=America/Bogota` — required for correct date calculations

### Deployment

Docker multi-stage build → Azure Container Apps via GitHub Actions (`.github/workflows/deploy-stage.yml`). Staging deploys on push to `staging` branch.
