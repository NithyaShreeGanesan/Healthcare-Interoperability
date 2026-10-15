/**
 * Realistic Mock Data for Consent-Based Healthcare Interoperability Platform (PS-013)
 * Synthetic data strictly - No real PHI.
 */

export const MOCK_USERS = [
  {
    id: 1,
    email: "dr.smith@metrohealth.org",
    role: "clinician",
    name: "Dr. Sarah Smith, MD",
    org: "Hospital A",
    linked_patient_id: null
  },
  {
    id: 2,
    email: "payer.agent@bluecross.org",
    role: "payer",
    name: "Marcus Vance (Claims Officer)",
    org: "Payer C",
    linked_patient_id: null
  },
  {
    id: 3,
    email: "jane.doe@email.com",
    role: "patient",
    name: "Jane E. Doe",
    org: "Self",
    linked_patient_id: "MP-83921"
  },
  {
    id: 4,
    email: "admin@interop.org",
    role: "admin",
    name: "Alex Rivera (System Administrator)",
    org: "HealthInterop Authority",
    linked_patient_id: null
  },
  {
    id: 5,
    email: "auditor@compliance.gov",
    role: "auditor",
    name: "Elena Rostova (HIPAA Compliance Auditor)",
    org: "Office for Civil Rights",
    linked_patient_id: null
  }
];

export const MOCK_PATIENTS = [
  {
    id: "MP-83921",
    firstName: "Jane",
    lastName: "Doe",
    dob: "1985-04-12",
    gender: "female",
    phone: "(555) 234-5678",
    address: "742 Evergreen Terrace, Springfield, OR",
    postalCode: "97477",
    identifiers: [
      { system: "Hospital A", mrn: "HA-99214" },
      { system: "Clinic B", mrn: "CB-41008" },
      { system: "Payer C", mrn: "PC-881920" }
    ]
  },
  {
    id: "MP-55201",
    firstName: "Robert",
    lastName: "Chen",
    dob: "1972-11-03",
    gender: "male",
    phone: "(555) 876-5432",
    address: "1088 Waterfront Way, Seattle, WA",
    postalCode: "98101",
    identifiers: [
      { system: "Hospital A", mrn: "HA-66712" },
      { system: "Clinic B", mrn: "CB-10294" }
    ]
  }
];

export const MOCK_CONSENTS = [
  {
    id: "CNS-001",
    master_patient_id: "MP-83921",
    grantee_type: "role",
    grantee_id: "clinician",
    grantee_display: "All Licensed Clinicians",
    resource_types: ["Condition", "Observation", "MedicationRequest", "AllergyIntolerance", "Immunization"],
    purpose: "treatment",
    status: "active",
    valid_from: "2026-01-01T00:00:00Z",
    valid_to: "2027-01-01T00:00:00Z",
    created_at: "2026-01-01T09:30:00Z",
    revoked_at: null
  },
  {
    id: "CNS-002",
    master_patient_id: "MP-83921",
    grantee_type: "user",
    grantee_id: "dr.smith@metrohealth.org",
    grantee_display: "Dr. Sarah Smith (Metro Health)",
    resource_types: ["Condition", "Observation", "MedicationRequest", "AllergyIntolerance", "Immunization", "Claim"],
    purpose: "treatment",
    status: "active",
    valid_from: "2026-02-15T00:00:00Z",
    valid_to: "2026-12-31T23:59:59Z",
    created_at: "2026-02-15T11:20:00Z",
    revoked_at: null
  },
  {
    id: "CNS-003",
    master_patient_id: "MP-83921",
    grantee_type: "org",
    grantee_id: "Payer C",
    grantee_display: "Blue Cross / Blue Shield (Payer C)",
    resource_types: ["Claim", "Coverage", "Condition"],
    purpose: "payment",
    status: "revoked",
    valid_from: "2025-06-01T00:00:00Z",
    valid_to: "2026-06-01T00:00:00Z",
    created_at: "2025-06-01T14:15:00Z",
    revoked_at: "2026-03-10T16:45:00Z"
  }
];

export const MOCK_RECORDS = {
  "MP-83921": [
    {
      id: "COND-01",
      resourceType: "Condition",
      code: "38341003",
      display: "Essential hypertension (disorder)",
      clinicalStatus: "active",
      source_system: "Hospital A",
      last_updated: "2026-10-02T10:14:00Z", // ~13 days ago (green)
      ingested_at: "2026-10-02T10:15:30Z",
      fhir_id: "cond-ha-8812"
    },
    {
      id: "COND-02",
      resourceType: "Condition",
      code: "44054006",
      display: "Type 2 diabetes mellitus",
      clinicalStatus: "active",
      source_system: "Clinic B",
      last_updated: "2026-07-20T14:30:00Z", // ~87 days ago (amber)
      ingested_at: "2026-07-20T14:35:00Z",
      fhir_id: "cond-cb-3391"
    },
    {
      id: "OBS-01",
      resourceType: "Observation",
      code: "85354-9",
      display: "Blood pressure panel with all children optional",
      value: "134/86 mmHg",
      category: "vital-signs",
      source_system: "Hospital A",
      last_updated: "2026-10-02T10:20:00Z", // ~13 days ago (green)
      ingested_at: "2026-10-02T10:21:00Z",
      fhir_id: "obs-ha-1092"
    },
    {
      id: "OBS-02",
      resourceType: "Observation",
      code: "4548-4",
      display: "Hemoglobin A1c/Hemoglobin.total in Blood",
      value: "6.8 % (Elevated)",
      category: "laboratory",
      source_system: "Clinic B",
      last_updated: "2026-07-20T14:40:00Z", // ~87 days ago (amber)
      ingested_at: "2026-07-20T14:45:00Z",
      fhir_id: "obs-cb-7721"
    },
    {
      id: "MED-01",
      resourceType: "MedicationRequest",
      code: "314076",
      display: "Lisinopril 10 MG Oral Tablet",
      status: "active",
      dosage: "Take 1 tablet daily by mouth",
      source_system: "Hospital A",
      last_updated: "2026-10-02T10:25:00Z", // ~13 days ago (green)
      ingested_at: "2026-10-02T10:26:00Z",
      fhir_id: "med-ha-5510"
    },
    {
      id: "MED-02",
      resourceType: "MedicationRequest",
      code: "860975",
      display: "Metformin hydrochloride 500 MG Oral Tablet",
      status: "active",
      dosage: "Take 1 tablet twice daily with meals",
      source_system: "Clinic B",
      last_updated: "2026-07-20T14:50:00Z", // ~87 days ago (amber)
      ingested_at: "2026-07-20T14:55:00Z",
      fhir_id: "med-cb-9182"
    },
    {
      id: "ALLERGY-01",
      resourceType: "AllergyIntolerance",
      code: "70618",
      display: "Penicillin G - Anaphylaxis reaction",
      criticality: "high",
      type: "allergy",
      source_system: "Hospital A",
      last_updated: "2025-10-15T08:00:00Z", // ~365 days ago (red)
      ingested_at: "2025-10-15T08:05:00Z",
      fhir_id: "alg-ha-0023"
    },
    {
      id: "IMM-01",
      resourceType: "Immunization",
      code: "158",
      display: "Influenza, injectable, quadrivalent",
      status: "completed",
      source_system: "Clinic B",
      last_updated: "2026-09-01T11:00:00Z", // ~44 days ago (amber)
      ingested_at: "2026-09-01T11:05:00Z",
      fhir_id: "imm-cb-4412"
    },
    {
      id: "CLAIM-01",
      resourceType: "Claim",
      code: "professional",
      display: "Comprehensive Outpatient Evaluation and Management",
      total: "$185.00 USD",
      status: "active",
      source_system: "Payer C",
      last_updated: "2026-09-28T16:30:00Z", // ~17 days ago (green)
      ingested_at: "2026-09-28T16:35:00Z",
      fhir_id: "clm-pc-3091"
    }
  ]
};

export const MOCK_DATA_ISSUES = [
  {
    id: "ISS-001",
    master_patient_id: "MP-83921",
    issue_type: "conflict",
    resource_type: "Observation",
    severity: "high",
    title: "ABO Blood Group Typing Mismatch",
    description: "Two clinical providers reported incompatible blood group types during recent encounters.",
    sourceA: {
      system: "Hospital A",
      field: "Blood Group",
      value: "A Rh+",
      recorded: "2026-10-02"
    },
    sourceB: {
      system: "Clinic B",
      field: "Blood Group",
      value: "O Rh+",
      recorded: "2026-07-20"
    },
    status: "unresolved",
    detected_at: "2026-10-02T10:30:00Z"
  },
  {
    id: "ISS-002",
    master_patient_id: "MP-83921",
    issue_type: "conflict",
    resource_type: "MedicationRequest",
    severity: "medium",
    title: "Lisinopril Dosage Discrepancy",
    description: "Hospital A active prescription specifies 10mg daily, while Clinic B record lists 20mg daily.",
    sourceA: {
      system: "Hospital A",
      field: "Dosage",
      value: "10 mg Oral Daily",
      recorded: "2026-10-02"
    },
    sourceB: {
      system: "Clinic B",
      field: "Dosage",
      value: "20 mg Oral Daily",
      recorded: "2026-07-20"
    },
    status: "flagged_for_clinician",
    detected_at: "2026-10-02T10:32:00Z"
  },
  {
    id: "ISS-003",
    master_patient_id: "MP-83921",
    issue_type: "missing",
    resource_type: "Patient",
    severity: "low",
    title: "Missing Primary Contact Phone Number",
    description: "Clinic B demographic payload omitted patient phone contact field.",
    sourceA: {
      system: "Hospital A",
      field: "Telecom",
      value: "(555) 234-5678",
      recorded: "2026-10-02"
    },
    sourceB: {
      system: "Clinic B",
      field: "Telecom",
      value: "<Missing / Not Provided>",
      recorded: "2026-07-20"
    },
    status: "unresolved",
    detected_at: "2026-07-20T14:40:00Z"
  },
  {
    id: "ISS-004",
    master_patient_id: "MP-83921",
    issue_type: "stale",
    resource_type: "Observation",
    severity: "medium",
    title: "Potential Duplicate Diagnostic Order (Lipid Panel)",
    description: "Identical fasting lipid diagnostic tests ordered and processed within 48 hours at different facilities.",
    sourceA: {
      system: "Hospital A",
      field: "Lipid Panel",
      value: "Total Cholesterol 210 mg/dL",
      recorded: "2026-09-20"
    },
    sourceB: {
      system: "Clinic B",
      field: "Lipid Panel",
      value: "Total Cholesterol 208 mg/dL",
      recorded: "2026-09-22"
    },
    status: "review_recommended",
    detected_at: "2026-09-23T08:15:00Z"
  }
];

export const MOCK_AUDIT_LOGS = [
  {
    id: 1084,
    ts: "2026-10-15T09:42:15Z",
    user_email: "dr.smith@metrohealth.org",
    role: "clinician",
    action: "READ",
    resource_type: "Condition, Observation, MedicationRequest",
    master_patient_id: "MP-83921",
    outcome: "allowed",
    reason: "Routine clinical follow-up consultation",
    ip: "192.168.1.104",
    prev_hash: "3a8f9c112b4e5d6a7f8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
    entry_hash: "a4c28f615392d4b967d028b1e4c9e8a7d3f1092837465abedcf184739281726a"
  },
  {
    id: 1083,
    ts: "2026-10-15T09:20:04Z",
    user_email: "payer.agent@bluecross.org",
    role: "payer",
    action: "READ",
    resource_type: "Condition, AllergyIntolerance",
    master_patient_id: "MP-83921",
    outcome: "denied",
    reason: "Blocked by Consent Policy: Payer consent for clinical notes revoked by patient",
    ip: "10.0.4.55",
    prev_hash: "8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c",
    entry_hash: "3a8f9c112b4e5d6a7f8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f"
  },
  {
    id: 1082,
    ts: "2026-10-15T08:11:32Z",
    user_email: "dr.smith@metrohealth.org",
    role: "clinician",
    action: "BREAK_GLASS",
    resource_type: "AllergyIntolerance, MedicationRequest",
    master_patient_id: "MP-55201",
    outcome: "allowed",
    reason: "Emergency department acute trauma triage - immediate clinical necessity",
    ip: "192.168.1.104",
    prev_hash: "1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
    entry_hash: "8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c"
  },
  {
    id: 1081,
    ts: "2026-10-14T16:45:10Z",
    user_email: "admin@interop.org",
    role: "admin",
    action: "INGEST",
    resource_type: "Bundle",
    master_patient_id: "MP-83921",
    outcome: "allowed",
    reason: "Automated ingestion pipeline - Hospital A synthetic bundle v4.2",
    ip: "127.0.0.1",
    prev_hash: "0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a",
    entry_hash: "1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f"
  },
  {
    id: 1080,
    ts: "2026-10-14T14:10:00Z",
    user_email: "jane.doe@email.com",
    role: "patient",
    action: "REVOKE",
    resource_type: "Consent",
    master_patient_id: "MP-83921",
    outcome: "allowed",
    reason: "Patient portal self-service consent revocation for Payer C",
    ip: "172.56.21.8",
    prev_hash: "9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    entry_hash: "0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a"
  }
];

export const SAMPLE_FHIR_BUNDLE = {
  resourceType: "Bundle",
  type: "collection",
  entry: [
    {
      resource: {
        resourceType: "Patient",
        id: "ha-patient-99214",
        identifier: [
          {
            system: "http://hospital-a.org/mrn",
            value: "HA-99214"
          }
        ],
        name: [
          {
            use: "official",
            family: "Doe",
            given: ["Jane", "Elizabeth"]
          }
        ],
        telecom: [
          {
            system: "phone",
            value: "(555) 234-5678",
            use: "home"
          }
        ],
        gender: "female",
        birthDate: "1985-04-12",
        address: [
          {
            line: ["742 Evergreen Terrace"],
            city: "Springfield",
            state: "OR",
            postalCode: "97477"
          }
        ]
      }
    },
    {
      resource: {
        resourceType: "Condition",
        id: "ha-cond-8812",
        clinicalStatus: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
              code: "active"
            }
          ]
        },
        code: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "38341003",
              display: "Essential hypertension (disorder)"
            }
          ]
        },
        subject: {
          reference: "Patient/ha-patient-99214"
        }
      }
    },
    {
      resource: {
        resourceType: "Observation",
        id: "ha-obs-1092",
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs"
              }
            ]
          }
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "85354-9",
              display: "Blood pressure panel with all children optional"
            }
          ]
        },
        subject: {
          reference: "Patient/ha-patient-99214"
        },
        valueString: "134/86 mmHg"
      }
    }
  ]
};
