"""Cross-system clinical conflict detector ensuring discrepant records are never silently merged."""

import datetime
from typing import Any, Dict, List, Optional
from app.extensions import db
from app.models.clinical_resource import ClinicalResource
from app.models.data_conflict import DataConflict
from app.models.patient import MasterPatient


def detect_and_record_conflicts(master_patient_id: str) -> List[DataConflict]:
    """Scan all clinical resources and demographic records across source systems for conflicts.

    Args:
        master_patient_id: Target master patient identifier.

    Returns:
        List of newly created or updated DataConflict entities.
    """
    conflicts_found: List[DataConflict] = []
    patient = db.session.get(MasterPatient, master_patient_id)
    if not patient:
        return conflicts_found

    resources: List[ClinicalResource] = ClinicalResource.query.filter_by(
        master_patient_id=master_patient_id
    ).all()

    # Group resources by source system and resource type
    by_source: Dict[str, List[ClinicalResource]] = {}
    for r in resources:
        by_source.setdefault(r.source_system, []).append(r)

    source_names = list(by_source.keys())
    if len(source_names) < 2:
        return conflicts_found

    # 1. Cross-check AllergyIntolerance (e.g. Penicillin vs NKDA / absent)
    allergy_sources: Dict[str, List[str]] = {}
    for src, res_list in by_source.items():
        allergies = [r.display.lower() for r in res_list if r.resource_type == "AllergyIntolerance" and r.display]
        if allergies:
            allergy_sources[src] = allergies

    if len(allergy_sources) >= 2:
        sources = list(allergy_sources.keys())
        for i in range(len(sources)):
            for j in range(i + 1, len(sources)):
                s_a, s_b = sources[i], sources[j]
                a_set, b_set = set(allergy_sources[s_a]), set(allergy_sources[s_b])
                discrepancy = a_set.symmetric_difference(b_set)
                if discrepancy:
                    conflict_category = "Allergy Intolerance Discrepancy"
                    source_a_val = f"Recorded: {', '.join(a_set)}" if a_set else "No allergy records"
                    source_b_val = f"Recorded: {', '.join(b_set)}" if b_set else "No allergy records"

                    existing = DataConflict.query.filter_by(
                        master_patient_id=master_patient_id,
                        category=conflict_category,
                        source_a=s_a,
                        source_b=s_b
                    ).first()

                    if not existing:
                        conflict = DataConflict(
                            master_patient_id=master_patient_id,
                            category=conflict_category,
                            source_a=s_a,
                            source_b=s_b,
                            source_a_val=source_a_val,
                            source_b_val=source_b_val,
                            source_a_date=datetime.datetime.now(datetime.timezone.utc),
                            source_b_date=datetime.datetime.now(datetime.timezone.utc),
                            severity="critical",
                            resolution_status="open"
                        )
                        db.session.add(conflict)
                        conflicts_found.append(conflict)

    # 2. Cross-check Condition Discrepancies (e.g. active diabetes vs unrecorded)
    cond_sources: Dict[str, List[str]] = {}
    for src, res_list in by_source.items():
        conditions = [r.display.lower() for r in res_list if r.resource_type == "Condition" and r.display]
        if conditions:
            cond_sources[src] = conditions

    if len(cond_sources) >= 2:
        sources = list(cond_sources.keys())
        for i in range(len(sources)):
            for j in range(i + 1, len(sources)):
                s_a, s_b = sources[i], sources[j]
                a_conds, b_conds = set(cond_sources[s_a]), set(cond_sources[s_b])
                cond_diff = a_conds.symmetric_difference(b_conds)
                if cond_diff:
                    conflict_category = "Condition Diagnostic Discrepancy"
                    existing = DataConflict.query.filter_by(
                        master_patient_id=master_patient_id,
                        category=conflict_category,
                        source_a=s_a,
                        source_b=s_b
                    ).first()
                    if not existing:
                        conflict = DataConflict(
                            master_patient_id=master_patient_id,
                            category=conflict_category,
                            source_a=s_a,
                            source_b=s_b,
                            source_a_val=f"Recorded: {', '.join(a_conds)}" if a_conds else "None reported",
                            source_b_val=f"Recorded: {', '.join(b_conds)}" if b_conds else "None reported",
                            source_a_date=datetime.datetime.now(datetime.timezone.utc),
                            source_b_date=datetime.datetime.now(datetime.timezone.utc),
                            severity="warning",
                            resolution_status="open"
                        )
                        db.session.add(conflict)
                        conflicts_found.append(conflict)

    db.session.commit()
    return conflicts_found
