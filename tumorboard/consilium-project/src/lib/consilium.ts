// Shared types, constants, and API helper for Consilium AI

export const API = "http://localhost:8081";

export type AgentName =
  | "radiology"
  | "oncology"
  | "surgery"
  | "radiation"
  | "trials"
  | "coordinator";

export const AGENTS: Record<
  AgentName,
  { label: string; tone: string; fields: string[]; blurb: string }
> = {
  radiology: {
    label: "Radiology",
    tone: "radiology",
    blurb: "Imaging characterization & anatomic mapping",
    fields: [
      "location",
      "volume_cc",
      "enhancement_pattern",
      "key_finding",
      "imaging_grade_suggestion",
      "nearest_critical_structures",
    ],
  },
  oncology: {
    label: "Oncology",
    tone: "oncology",
    blurb: "Diagnosis, prognosis & biomarker strategy",
    fields: [
      "likely_diagnosis",
      "differential_diagnoses",
      "prognosis_context",
      "urgency",
      "recommended_biomarkers",
    ],
  },
  surgery: {
    label: "Neurosurgery",
    tone: "surgery",
    blurb: "Resectability, approach & operative risk",
    fields: [
      "resectable",
      "recommended_approach",
      "expected_resection_extent",
      "surgical_risk_level",
      "awake_craniotomy_recommended",
      "surgical_note",
    ],
  },
  radiation: {
    label: "Radiation Oncology",
    tone: "radiation",
    blurb: "Modality, dose planning & OAR analysis",
    fields: [
      "recommended_modality",
      "total_dose_concept",
      "treatment_timing",
      "organs_at_risk",
      "radiation_note",
    ],
  },
  trials: {
    label: "Clinical Trials",
    tone: "trials",
    blurb: "Genomic matching & enrollment opportunities",
    fields: [
      "trials_note",
      "genomic_testing_recommended",
      "priority_tests",
      "matched_trials",
    ],
  },
  coordinator: {
    label: "Care Coordination",
    tone: "coordinator",
    blurb: "Multidisciplinary consensus & next steps",
    fields: ["multidisciplinary_consensus", "urgency_flag"],
  },
};

export const ORDER: AgentName[] = [
  "radiology",
  "oncology",
  "surgery",
  "radiation",
  "trials",
  "coordinator",
];

export type CaseInputs = {
  volume: number | null;
  location: string;
  age: number | null;
  sex: string;
  notes: string;
};
