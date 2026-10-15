# Healthcare Interoperability Platform - Backend (PS-013)

Flask 3.0 + SQLAlchemy + PyMySQL backend implementing HL7 FHIR R4 interoperability, Master Patient Index (MPI), 4-stage gated read security, and tamper-evident SHA-256 audit chaining.

---

## Architecture Overview

```text
/backend/
├── app/
│   ├── __init__.py           # Flask application factory, CORS, JWT error handlers
│   ├── config.py             # Config management (.env) for dev, test, and prod
│   ├── extensions.py         # SQLAlchemy, JWTManager, CORS instances
│   ├── models/
│   │   ├── user.py           # User entity with bcrypt and RBAC roles
│   │   ├── patient.py        # MasterPatient and LocalPatientMapping (MPI)
│   │   ├── consent.py        # Consent directive entity with FHIR mapping
│   │   ├── clinical_resource.py # Clinical records (FHIR R4 JSON) with lineage
│   │   ├── data_conflict.py  # Cross-source clinical discrepancies (never silently merged)
│   │   └── audit_log.py      # SHA-256 hash-chained immutable audit log
│   ├── blueprints/
│   │   ├── auth_bp.py        # /api/auth (login, me, register)
│   │   ├── ingest_bp.py      # /api/ingest (single intake and FHIR R4 bundles)
│   │   ├── consent_bp.py     # /api/consents (grant, list, revoke)
│   │   ├── records_bp.py     # /api/records/request (4-Stage Security Gate)
│   │   ├── data_quality_bp.py # /api/data-issues (flagged conflicts)
│   │   ├── audit_bp.py       # /api/audit-logs (verification, tamper detection)
│   │   └── health_bp.py      # /api/health (DB & service diagnostics)
│   ├── services/
│   │   ├── audit_service.py  # Cryptographic SHA-256 chaining & verification
│   │   ├── consent_service.py # Policy evaluation & break-glass override logic
│   │   ├── mpi_service.py    # Deterministic & probabilistic identity resolution
│   │   ├── conflict_detector.py # Cross-source clinical discrepancy detection
│   │   └── fhir_service.py   # FHIR R4 ingestion, normalization, lineage
│   └── utils/
│       ├── crypto.py         # Bcrypt hashing, Fernet field-level encryption, blind indexing
│       └── fhir_helpers.py   # FHIR validation, freshness calculation
├── tests/                    # 19 comprehensive pytest test suites
└── scripts/
    ├── init_db.py            # DB initialization and synthetic seeding
    ├── generate_certs.py     # Dev self-signed SSL/TLS certificate generator
    └── run_server.py         # HTTP / HTTPS dev server runner
```

---

## Quickstart

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration uses SQLite for instant local zero-dependency testing. To use MySQL 8:
```env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/healthcare_interop
```

### 3. Generate Dev Certificates & Seed Database
```bash
python scripts/generate_certs.py
python scripts/init_db.py
```

### 4. Run Pytest Suite
```bash
pytest -q
```
Expected output: `19 passed in ~25s`.

### 5. Start Development Server
```bash
# Over HTTP
python scripts/run_server.py

# Over HTTPS (using self-signed cert)
python scripts/run_server.py --https
```
Server listens on `http://localhost:5000` or `https://localhost:5000`.

---

## 4-Stage Security Gate Pipeline

Every record query through `POST /api/records/request` executes through 4 non-bypassable stages:
1. **Authentication:** Validated via JWT Bearer token with expiration checks.
2. **Role Permission (RBAC):** Checks requesting user role (`clinician`, `patient`, `payer`, `admin`, `auditor`).
3. **Patient Consent Verification:** Evaluates active consent directives matching role, purpose, and resource types. If break-glass emergency is invoked by clinician, validates clinical justification ($\ge 10$ chars).
4. **Tamper-Evident Audit Logging:** Cryptographically records access (`READ`, `BREAK_GLASS`, or `ACCESS_BLOCKED`) chained via SHA-256 to the previous audit log hash.
