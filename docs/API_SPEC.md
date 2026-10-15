# REST API Specification: Healthcare Interoperability Platform (PS-013)

Standard: **HL7 FHIR R4 JSON over REST**
Base URL: `http://localhost:5000/api` (or `https://localhost:5000/api`)

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login`
Authenticate user with email and password.
- **Request Body:**
  ```json
  {
    "email": "dr.smith@metrohealth.org",
    "password": "Clinician@123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": 1,
      "email": "dr.smith@metrohealth.org",
      "role": "clinician",
      "name": "Dr. Sarah Smith, MD",
      "org": "Hospital A",
      "linked_patient_id": null
    }
  }
  ```

### `GET /api/auth/me`
Retrieve currently authenticated user profile.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** User dictionary.

---

## 2. Ingestion & MPI (`/api/ingest`)

### `POST /api/ingest`
Ingests an HL7 FHIR R4 Bundle or single demographic intake.
- **Headers:**
  - `Authorization: Bearer <token>`
  - `X-Source-System`: `Hospital A` | `Clinic B` | `Payer C`
- **Request Body (Single Intake):**
  ```json
  {
    "firstName": "Jane",
    "lastName": "Doe",
    "dob": "1985-04-12",
    "gender": "female",
    "ssn": "987-65-4321",
    "phone": "555-234-5678",
    "bloodType": "O-Positive"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "status": "success",
    "master_patient_id": "MP-83921",
    "fhir_id": "patient-MP-83921",
    "match_status": "exact_identifier",
    "match_score": 1.0,
    "message": "Patient matched to existing record in Master Patient Index (MPI)."
  }
  ```
- **Request Body (FHIR Bundle):** `{ "resourceType": "Bundle", "entry": [...] }`

---

## 3. Consent Management (`/api/consents`)

### `GET /api/consents?master_patient_id=MP-83921`
List active and historical consents for a patient.
- **Response (200 OK):**
  ```json
  {
    "consents": [
      {
        "id": "CNS-101",
        "master_patient_id": "MP-83921",
        "grantee_type": "role",
        "grantee_id": "clinician",
        "grantee_display": "All Licensed Healthcare Clinicians",
        "resource_types": ["*"],
        "purpose": "treatment",
        "status": "active",
        "valid_from": "2026-09-15T00:00:00Z",
        "valid_to": "2027-03-15T00:00:00Z"
      }
    ]
  }
  ```

### `POST /api/consents`
Create a patient consent directive.
- **Request Body:**
  ```json
  {
    "master_patient_id": "MP-83921",
    "grantee_type": "role",
    "grantee_id": "payer",
    "grantee_display": "BlueCross Payer C",
    "resource_types": ["Condition", "MedicationRequest"],
    "purpose": "payment",
    "valid_to": "2027-04-01T00:00:00Z"
  }
  ```

### `DELETE /api/consents/<consent_id>`
Revoke consent.

---

## 4. 4-Stage Gated Records Access (`/api/records/request`)

### `POST /api/records/request`
Read unified patient records gated by Auth $\rightarrow$ RBAC $\rightarrow$ Consent $\rightarrow$ Audit.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "master_patient_id": "MP-83921",
    "resourceTypes": ["Condition", "Observation"],
    "purpose": "treatment",
    "breakGlass": false,
    "justification": null
  }
  ```
- **Response (200 OK - Allowed):**
  ```json
  {
    "master_patient_id": "MP-83921",
    "patient": {
      "id": "MP-83921",
      "firstName": "Jane",
      "lastName": "Doe",
      "dob": "1985-04-12",
      "gender": "female",
      "blood_type": "O-Positive"
    },
    "records": [
      {
        "id": "cond-hosp-001",
        "resourceType": "Condition",
        "code": "I10",
        "display": "Essential (primary) hypertension",
        "status": "active",
        "source_system": "Hospital A",
        "last_updated": "2026-09-28T14:15:00Z",
        "ingested_at": "2026-09-28T14:15:00Z",
        "freshness": {
          "days_old": 17,
          "status": "fresh",
          "label": "17d ago (Fresh)"
        }
      }
    ],
    "break_glass_active": false
  }
  ```
- **Response (403 Forbidden - Gated by Consent):**
  ```json
  {
    "status": 403,
    "consentStatus": "no_consent",
    "message": "Access Denied: Read blocked by Patient Consent Policy.",
    "reason": "Patient consent policy does not permit role 'payer' to access: Observation.",
    "unconsented_resources": ["Observation"]
  }
  ```

---

## 5. Data Quality & Conflicts (`/api/data-issues`)

### `GET /api/data-issues`
Returns discrepancies across source systems (never silently merged).
- **Response (200 OK):**
  ```json
  {
    "issues": [
      {
        "id": 1,
        "master_patient_id": "MP-83921",
        "category": "Allergy Intolerance Discrepancy",
        "source_a": "Clinic B",
        "source_b": "Hospital A",
        "source_a_val": "Severe Penicillin Anaphylaxis (Active RxNorm 7980)",
        "source_b_val": "No Known Drug Allergies (NKDA) recorded in chart",
        "severity": "critical",
        "resolution_status": "open"
      }
    ]
  }
  ```

---

## 6. Tamper-Evident Audit Logs (`/api/audit-logs`)

### `GET /api/audit-logs`
Retrieve audit logs with cryptographic hash chains.

### `GET /api/audit-logs/verify`
Verify cryptographic integrity of the entire audit chain.
- **Response (200 OK):**
  ```json
  {
    "is_valid": true,
    "details": "Audit chain verified successfully across all 15 entries.",
    "total_verified": 15,
    "broken_entry_id": null
  }
  ```
