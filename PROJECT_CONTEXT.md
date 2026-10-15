You are building a hackathon project: "Consent-based Healthcare Interoperability Platform" (PS-013).

STACK (do not deviate):
- Backend: Python 3.11 + Flask (blueprints, app factory), SQLAlchemy + PyMySQL
- DB: MySQL 8
- Standard: HL7 FHIR R4, JSON only, REST over HTTPS (self-signed cert for dev)
- Frontend: React (Vite) + plain CSS
- Security: JWT auth, bcrypt, RBAC, field-level encryption (cryptography.Fernet), audit logs
- Test data: Synthea FHIR R4 sample bundles (synthetic only, no real PHI)

CORE ARCHITECTURE:
- Multiple simulated "source systems" (Hospital A, Clinic B, Payer C) each hold their own copy of patient data with different identifiers/formats.
- An integration layer ingests, validates, normalizes terminology, matches patient identity into a master patient index (MPI), and serves a unified FHIR view.
- Every read is gated by: authentication -> role permission -> patient consent -> audit log.
- Every returned record shows source system and freshness (last_updated, ingested_at).
- Missing/conflicting data is flagged, never silently merged.

REPO LAYOUT:
/backend/app/{__init__.py,config.py,extensions.py,models/,blueprints/,services/,utils/}
/backend/tests/
/backend/scripts/
/frontend/src/
/data/synthea/
/docs/

RULES: type hints, docstrings, .env for secrets, no hardcoded keys, small commits, every module ships with pytest tests and a short README section. Ask before adding any dependency not in the stack. Confirm you understand and list the folders you'll create.
