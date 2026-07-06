# EpiBridge - Architecture Summary

## Vision

EpiBridge is a secure remote analysis platform for epidemiology and other sensitive research data.

The guiding principle is:

Move the computation to the data, not the data to the computation.

Rather than giving researchers direct access to sensitive datasets, EpiBridge allows them to develop analyses locally using schema documentation and synthetic/sample data, submit analysis jobs to the data owner, execute those jobs within a secure institutional environment, and receive approved outputs after review.

⸻

## High-level Workflow

Researcher
    │
    ▼
Develop analysis locally
(schema + synthetic data)
    │
    ▼
Submit analysis bundle
    │
    ▼
Administrator approves execution
    │
    ▼
Analysis runs inside secure environment
    │
    ▼
Outputs generated
    │
    ▼
Administrator approves outputs
    │
    ▼
Researcher downloads approved results

Sensitive data never leaves the institution.

⸻

## Deployment Model

Each institution runs its own EpiBridge instance inside a restricted Linux virtual machine.

Institution
└── Virtual Machine
        │
        ├── EpiBridge Platform
        ├── Local Sensitive Data
        └── Analysis Containers

The VM is the trust boundary.

The VM hosts:

* Next.js frontend
* FastAPI backend
* PostgreSQL
* Redis
* Worker service
* Audit logs
* Docker Engine

No external system accesses the sensitive data directly.

⸻

## Execution Model

The platform itself never executes user code.

Instead:

User submits job
        │
        ▼
Worker service
        │
        ▼
Launch ephemeral Docker container
        │
        ▼
Container reads dataset
        │
        ▼
Produces outputs
        │
        ▼
Container destroyed

Each analysis executes inside an isolated container.

Container security should include:

* no internet access
* non-root user
* read-only dataset mount
* temporary writable workspace
* CPU limits
* memory limits
* execution timeout
* automatic cleanup after completion

⸻

## Platform Components

Internet
    │
HTTPS
    │
Reverse Proxy
    │
────────────────────────────
EpiBridge
────────────────────────────
Frontend (Next.js)
↓
Backend API (FastAPI)
↓
PostgreSQL
Redis
↓
Worker
↓
Docker Engine
↓
Ephemeral Analysis Containers
↓
Local Sensitive Data

⸻

## Technology Stack

### Frontend

* Next.js
* React
* TypeScript

### Backend

* FastAPI
* SQLAlchemy
* Alembic

## Authentication

* Firebase Authentication
* Email/password
* Google
* Microsoft

Application permissions are managed within PostgreSQL.

## Database

* PostgreSQL

## Queue

* Redis
* Celery or Dramatiq

## Execution

* Docker

## Deployment

* Docker Compose initially
* Kubernetes later

⸻

## Authentication and Authorisation

Authentication is handled by Firebase.

Authorisation is handled internally.

Example roles:

* Researcher
* Project Admin
* Data Steward
* System Administrator

Permissions are stored in PostgreSQL.

The application should never depend directly on Firebase beyond validating JWT tokens.

⸻

## Repository Structure

epibridge/
frontend/
    Next.js
backend/
    FastAPI
worker/
    Job execution service
shared/
    Shared schemas/types
containers/
    Base analysis images
examples/
    Synthetic datasets
    Analysis templates
docs/
scripts/

Single monorepo.

⸻
## Backend Structure

backend/app/
api/
services/
models/
schemas/
db/
auth/
core/

Business logic should live in the service layer rather than API endpoints.

⸻

## Frontend Pages

### Researchers

* Login
* Dashboard
* Projects
* Submit Job
* Job Status
* Outputs
* Settings

### Administrators

* Pending Jobs
* Pending Outputs
* Projects
* Users
* Audit Logs

⸻

## Database Entities

Core entities:

* User
* Project
* Membership
* DataResource — institutional asset available for analysis (not owned by EpiBridge)
* ResourceProvider — validates resource endpoints and describes runtime requirements
* Job
* JobFile
* Output
* Approval
* AuditLog

⸻

## Data Resources

EpiBridge does not own, store, or manage scientific data.

A **Data Resource** represents an existing institutional data asset that has been
registered for analysis. The institution owns and manages the underlying data;
EpiBridge provides a catalogue of available resources, access control, and secure
execution.

### Resource Providers

A **Resource Provider** is an abstraction that knows how to make a particular type
of data resource available for analysis. Implementations include:

* **CsvProvider** — a CSV file available at a known path
* **DuckDBProvider** — a DuckDB database
* **PostgresProvider** — a PostgreSQL database
* **ExcelProvider** — an Excel workbook
* **ParquetProvider** — a directory of Parquet files

The provider has two responsibilities:

1. **`validate_endpoint(endpoint)`** — is the endpoint configuration well-formed?
2. **`prepare_runtime(endpoint)`** — what mount points and environment variables are
   needed to expose this resource inside an analysis container?

Providers describe runtime requirements in platform-agnostic terms (`Mount`,
`RuntimeConfig`). An Executor (Docker, Kubernetes, Slurm, etc.) translates these into
the corresponding infrastructure.

### Runtime Contract

EpiBridge never knows the physical host path of data resources. The deployment
environment guarantees that configured resources are reachable at:

```
/read-only-data
```

How resources arrive there (host directory mount, NFS, cloud storage, database
connection) is entirely the deployment's responsibility.

### Project Association

A **Project** represents permission to analyse one or more Data Resources.
Projects do not own resources — they reference them through a many-to-many
relationship (`ProjectDataResource`). A single Data Resource may be associated
with multiple projects over time.

⸻

## Analysis Submission

Researchers should submit an analysis bundle rather than arbitrary scripts.

Example:

analysis.zip
manifest.yaml
run.py
requirements.txt
README.md

This improves reproducibility.

⸻

### Job Lifecycle

Draft
↓
Submitted
↓
Pending Approval
↓
Approved
↓
Running
↓
Completed
↓
Output Review
↓
Approved
↓
Downloaded

⸻

### Audit Trail

Everything should be recorded.

Examples:

* User logged in
* Job submitted
* Job approved
* Job rejected
* Job started
* Job completed
* Outputs approved
* Outputs downloaded

Audit logs should be immutable.

⸻
## Storage

Create a storage abstraction for *job files and outputs*.

storage.save()
storage.load()
storage.delete()

Data resources are never ingested or stored by EpiBridge — they remain under
institutional control and are exposed through the runtime contract (/read-only-data).

The storage abstraction is initially backed by the local filesystem.

Later replace with:

* S3
* MinIO
* Azure Blob

No application code should need changing.

⸻

# Execution Abstraction

The Worker never manages containers directly.

It delegates to an executor interface:

```
Worker
  └── Executor (interface)
        └── run(job) → Result

Implementations:
  ├── DockerExecutor      ← communicates with Docker Engine
  ├── KubernetesExecutor  ← creates Kubernetes Jobs
  └── SlurmExecutor       ← submits Slurm batch jobs
```

The platform must not depend on any specific execution backend.

Only the `DockerExecutor` talks to Docker Engine. The Worker holds a reference to whatever `Executor` implementation is configured at startup — it never imports or calls the Docker SDK directly.

This means:
- The Docker socket is a private implementation detail of `DockerExecutor`, not a platform concern
- Replacing Docker with Kubernetes or Slurm requires zero changes outside the Worker

```
Worker
  └── Executor (interface)
        └── DockerExecutor
              └── Docker Engine (via socket)
                    └── Ephemeral analysis container
                          ├── datasets (read-only)
                          ├── workspace (temporary)
                          └── output directory (writable)
```

The executor is responsible for:
- pulling the analysis image (if not present)
- creating the container with resource limits, read-only dataset mounts, and no network
- streaming logs to the audit trail
- collecting the exit code and output files
- destroying the container after completion

⸻

# Cloud Migration

Initial deployment:

Single Ubuntu VM
Docker Compose

Future:

Kubernetes
API Pods
Worker Pods
PostgreSQL
Redis
Ingress

Very little application code should change.

⸻

# Federation

Long-term architecture:

Oxford
    EpiBridge
        │
    Local Data
Imperial
    EpiBridge
        │
    Local Data
LSHTM
    EpiBridge
        │
    Local Data

Researchers submit analyses independently to each institution.

Sensitive datasets remain local.

Only approved outputs are returned.

⸻

# Architectural Principles

1. Move computation to the data.
2. Never expose database access.
3. Every analysis executes inside an isolated container.
4. Human approval before execution.
5. Human approval before outputs leave the environment.
6. Complete audit trail.
7. Portable deployment.
8. Cloud-ready but cloud-independent.
9. Modular services.
10. Reproducible execution.

## Domain Principles

11. **Data Resource** = institutional asset; **Project** = permission to analyse
    one or more institutional assets.
12. No Docker references in the provider layer — the provider describes runtime
    requirements in platform-agnostic terms; the executor implements them.
13. `/read-only-data` is the runtime contract; the application never knows host paths.
14. `endpoint` defines how the runtime reaches the resource, not generic configuration.
15. `validate_endpoint()` validates the endpoint definition; `prepare_runtime()`
    describes execution requirements.
16. The deployment owns physical storage; EpiBridge owns the catalogue and execution
    model.
17. The application must never assume where underlying data physically resides — it
    only understands Data Resources, Resource Providers, and Runtime Endpoints.

⸻
# MVP Scope

* Authentication
* Database
* User management
* Projects

* Data Resource model
* Resource Provider abstraction

* Job submission
* Dashboard

* Approval workflow

* Worker
* Docker execution

* Output approval
* Downloads
* Audit logging

This provides a complete end-to-end proof of concept while leaving advanced features (notifications, quotas, federation, Kubernetes, multiple execution backends, statistical disclosure control automation) for later iterations.
