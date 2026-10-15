# Consent-based Healthcare Interoperability Platform (PS-013)

A full-stack, enterprise-grade healthcare interoperability platform built to solve fragmented medical data across disparate source systems (**Hospital A**, **Clinic B**, **Payer C**) using **HL7 FHIR R4**, **Master Patient Index (MPI)**, **4-Stage Gated Security**, **Patient Consent Directives**, and **Cryptographic Tamper-Evident Audit Trails**.

---

## 🛠️ Stack Architecture

| Layer | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Backend** | Python 3.11/3.13 + Flask 3.0 | Application factory, Blueprints, REST API over HTTPS / HTTP |
| **Database** | MySQL 8 / SQLite fallback | SQLAlchemy 2.0 ORM, PyMySQL driver, ACID compliance |
| **Standard** | HL7 FHIR R4 | JSON only, FHIR Resources (Patient, Condition, Observation, AllergyIntolerance, MedicationRequest, Consent, Bundle) |
| **Security** | JWT + bcrypt + cryptography.Fernet | Field-level PHI encryption, Role-Based Access Control (RBAC), salted blind index |
| **Frontend** | React 18 + Vite + Plain CSS | Modern healthcare design system, responsive UI, zero external component frameworks |
| **Audit Trail**| Cryptographic SHA-256 Chaining | Tamper-evident ledger with integrity verification |
| **Test Data** | Synthea Synthetic FHIR R4 Bundles | Hospital A, Clinic B, Payer C test data (no real PHI) |

---

## 🚀 Key Features

1. **Master Patient Index (MPI):**
   - Salted blind indexing (deterministic SHA-256) for SSN/National IDs.
   - Deterministic demographic matching (Name + DOB).
   - Probabilistic fuzzy matching (token-based Levenshtein similarity with identical DOB).
2. **4-Stage Security Gated Reads:**
   - `Authentication (JWT)` $\rightarrow$ `RBAC Role Check` $\rightarrow$ `Patient Consent Verification` $\rightarrow$ `SHA-256 Chained Audit Log`.
3. **Emergency Break-Glass Override:**
   - Clinicians can bypass consent restrictions in life-threatening scenarios with mandatory clinical justification ($\ge 10$ chars) and automatic priority audit logging.
4. **Data Provenance & Freshness Lineage:**
   - Every returned clinical record explicitly attributes `source_system` (Hospital A, Clinic B, Payer C) and displays calculated freshness chips:
     - 🟢 **Fresh** ($\le 30$ days)
     - 🟡 **Recent** ($31 - 180$ days)
     - 🔴 **Stale** ($> 180$ days)
5. **No Silent Merging & Discrepancy Tracking:**
   - Discrepant records across systems (e.g. Hospital A has no drug allergies, Clinic B records severe Penicillin anaphylaxis) are preserved in their distinct sources and actively flagged in the Data Quality center.
6. **Cryptographic Tamper Detection:**
   - Audit trail is linked via SHA-256 hash chaining. If any row is modified in the database, the platform detects the altered record immediately.

---

## 🔑 Demo User Credentials

| Role | Email | Password | Organization / Notes |
| :--- | :--- | :--- | :--- |
| **Clinician** | `dr.smith@metrohealth.org` | `Clinician@123` | Hospital A (Full emergency break-glass permissions) |
| **Patient** | `jane.doe@patient.org` | `Patient@123` | Jane Doe (Linked to `MP-83921`, grants/revokes consents) |
| **Payer** | `payer.claims@bluecross.org` | `Payer@123` | BlueCross Payer C (Restricted by consent; cannot view labs/allergies) |
| **Auditor** | `compliance@healthaudit.gov`| `Auditor@123` | OCR Federal Audit (Validates cryptographic audit chain) |
| **Admin** | `admin@interop.org` | `Admin@123` | Interop Foundation (Full system and user administration) |

---

## 💻 Getting Started

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Generate dev SSL certificates & seed database
python scripts/generate_certs.py
python scripts/init_db.py

# Run all 19 unit & integration tests
pytest -q

# Start Flask server (HTTP or HTTPS)
python scripts/run_server.py
```
Backend API will be available at: `http://localhost:5000/api`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will be available at: `http://localhost:3000`

---

## 🧪 Testing Verification

The backend includes a comprehensive pytest suite covering all architectural requirements:
```bash
cd backend
pytest -v
```
- `test_crypto.py`: Bcrypt password hashing, Fernet field-level encryption, salted blind index hashing.
- `test_mpi.py`: Deterministic SSN matching, demographic matching, probabilistic Levenshtein similarity, new patient generation.
- `test_security_gates.py`: Gated reads, 401 unauthenticated, 403 consent restriction, clinician break-glass override, patient self-access boundary.
- `test_audit_chain.py`: SHA-256 hash chaining validity and automated database tamper detection.
- `test_fhir_ingest.py`: Synthea bundle parsing, lineage extraction, and cross-system conflict detection.
