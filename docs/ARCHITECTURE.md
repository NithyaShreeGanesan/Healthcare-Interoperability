# Architecture Specification: Consent-based Healthcare Interoperability Platform (PS-013)

## 1. Executive Summary

The **Consent-based Healthcare Interoperability Platform** solves the fragmented healthcare data dilemma by securely integrating siloed clinical records (Hospital A, Clinic B, Payer C) into a unified HL7 FHIR R4 standard view while ensuring:
1. **Master Patient Index (MPI):** Multi-factor deterministic and probabilistic identity resolution.
2. **4-Stage Security Gated Reads:** Authentication $\rightarrow$ RBAC $\rightarrow$ Patient Consent $\rightarrow$ Audit Logging.
3. **Emergency Break-Glass:** Clinician emergency override with audit trail and mandatory justification.
4. **Data Provenance & Freshness Lineage:** Every record attributes `source_system`, `last_updated`, and `ingested_at`.
5. **No Silent Merging:** Discrepant data (conflicting allergies, blood types) is flagged in an open conflict registry.
6. **Tamper-Evident Audit Trail:** SHA-256 hash-chained immutable logging.

---

## 2. Core Architecture Diagram

```mermaid
flowchart TD
    subgraph DisparateSourceSystems ["Disparate Source Systems"]
        HospA["Hospital A<br/>(Local MRN, Vitals, Conditions)"]
        ClinicB["Clinic B<br/>(Labs, Allergies, Glucose)"]
        PayerC["Payer C<br/>(Claims, Med Requests)"]
    end

    subgraph IntegrationLayer ["Integration & MPI Layer"]
        IngestEngine["FHIR R4 Ingestion Engine"]
        MPISvc["Master Patient Index (MPI)<br/>- Salted SHA-256 SSN Blind Index<br/>- Deterministic Demographic Match<br/>- Probabilistic Name Similarity"]
        ConflictDetector["Cross-System Conflict Detector<br/>(Flags Discrepancies, Never Silent Merge)"]
    end

    subgraph DatabaseLayer ["Data & Security Layer"]
        DB[(MySQL 8 / SQLite)]
        CryptoEngine["Fernet Field-Level Encryption<br/>(PHI SSN, Phone, Address)"]
        AuditChain["Tamper-Evident Audit Chain<br/>(SHA-256 Chained Hash)"]
    end

    subgraph GatedAccess ["4-Stage Gated Access Pipeline"]
        Gate1["Stage 1: JWT Authentication"]
        Gate2["Stage 2: RBAC Role Check"]
        Gate3["Stage 3: Patient Consent Policy & Break-Glass"]
        Gate4["Stage 4: Tamper-Evident Audit Logging"]
    end

    subgraph Clients ["Web Client Portals"]
        ClinicianUI["Clinician Workspace"]
        PatientUI["Patient Consent Portal"]
        PayerUI["Payer Claims View"]
        AuditorUI["Auditor Chain Verification"]
    end

    HospA -->|FHIR Bundle / HTTPS| IngestEngine
    ClinicB -->|FHIR Bundle / HTTPS| IngestEngine
    PayerC -->|FHIR Bundle / HTTPS| IngestEngine

    IngestEngine --> MPISvc
    MPISvc --> DB
    IngestEngine --> ConflictDetector
    ConflictDetector --> DB

    Clients --> Gate1
    Gate1 --> Gate2
    Gate2 --> Gate3
    Gate3 --> Gate4
    Gate4 --> DB
```

---

## 3. The 4-Stage Security Gate Pipeline

Every read access to patient clinical records (`POST /api/records/request`) passes through four sequential gates:

```mermaid
sequenceDiagram
    autonumber
    actor User as Clinician / Payer / Patient
    participant API as Records Blueprint
    participant RBAC as Role Verifier
    participant Consent as Consent Engine
    participant Audit as Audit Service (SHA-256)
    participant DB as Clinical DB

    User->>API: POST /api/records/request (JWT Token + Body)
    Note over API: Stage 1: Authenticate JWT Token
    alt JWT Invalid / Missing
        API-->>User: 401 Unauthorized
    end

    API->>RBAC: Validate Role Permissions
    alt Patient trying to access another patient's records
        RBAC-->>API: Denied (Self-Access Boundary)
        API->>Audit: Record ACCESS_BLOCKED
        API-->>User: 403 Forbidden
    end

    API->>Consent: Evaluate Active Consents for (Role, Purpose, Resources)
    alt Emergency Break-Glass Invoked by Clinician
        Consent->>Consent: Validate Justification (length >= 10 chars)
        Consent-->>API: Authorized under Emergency Override
        API->>Audit: Record BREAK_GLASS (SHA-256 hash chained)
        API->>DB: Query Clinical Records with Freshness & Provenance
        DB-->>API: Returns records
        API-->>User: 200 OK (break_glass_active = true)
    else Active Consent Directive Exists
        Consent-->>API: Authorized (All requested resources consented)
        API->>Audit: Record READ (SHA-256 hash chained)
        API->>DB: Query Clinical Records
        DB-->>API: Returns records
        API-->>User: 200 OK
    else Consent Missing or Restricted
        Consent-->>API: Denied (Unconsented resources: Observation, etc.)
        API->>Audit: Record ACCESS_BLOCKED (SHA-256 hash chained)
        API-->>User: 403 Forbidden (consentStatus = "no_consent")
    end
```

---

## 4. Master Patient Index (MPI) Matching Algorithm

1. **Exact Local Source Mapping:** Look up `(source_system, local_patient_id)` in `local_patient_mappings`. If found $\rightarrow$ Match confidence: `1.0`.
2. **Salted Blind Index Matching:** Normalized SSN/National ID hashed via salted SHA-256. If match found $\rightarrow$ Match confidence: `1.0`.
3. **Exact Demographic Match:** Match on `(first_name, last_name, dob)` ignoring case and whitespace. If match found $\rightarrow$ Match confidence: `0.98`.
4. **Probabilistic Matching:** For records sharing identical DOB, calculate token-based Levenshtein/character similarity:
   $$\text{Score} = (0.45 \times \text{Sim}_{\text{first}}) + (0.55 \times \text{Sim}_{\text{last}})$$
   If $\text{Score} \ge 0.85 \rightarrow$ Link to existing Master Patient.
5. **New Identity Creation:** If none of the above match, allocate a new Master Patient ID (`MP-XXXXX`) and store Fernet-encrypted identifier and demographics.

---

## 5. Tamper-Evident SHA-256 Cryptographic Hash Chaining

The audit log functions as an append-only cryptographic chain:

$$\text{hash}_0 = \text{GENESIS\_HASH} = \text{"0000000000000000000000000000000000000000000000000000000000000000"}$$
$$\text{hash}_n = \text{SHA-256}(\text{hash}_{n-1} \,|\, \text{ts} \,|\, \text{user\_email} \,|\, \text{role} \,|\, \text{action} \,|\, \text{resource\_type} \,|\, \text{patient\_id} \,|\, \text{outcome} \,|\, \text{reason} \,|\, \text{ip})$$

Any direct unauthorized edit to past rows (via SQL update, compromised database admin, or backup alteration) causes immediate chain verification failure at `/api/audit-logs/verify`.
