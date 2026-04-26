import google.generativeai as genai
import json
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

# ── Agent Prompts ─────────────────────────────────────────────────────────────

AGENT_PROMPTS = {
    "radiology": """You are an expert neuroradiologist on a tumor board.

Given tumor imaging data: {context}

Analyze the imaging characteristics. Return ONLY valid JSON, no markdown:
{{
  "location": "specific brain region",
  "volume_cc": {volume_cc},
  "shape_description": "description of tumor shape and borders",
  "nearest_critical_structures": ["structure1", "structure2"],
  "edema_present": true,
  "enhancement_pattern": "ring-enhancing/homogeneous/heterogeneous",
  "mass_effect": "mild/moderate/severe/none",
  "key_finding": "one sentence clinical summary",
  "imaging_grade_suggestion": "low-grade/high-grade"
}}""",

    "oncology": """You are an expert neuro-oncologist on a tumor board.

Given radiology findings: {context}

Provide oncological assessment. Return ONLY valid JSON, no markdown:
{{
  "likely_diagnosis": "most likely tumor type and grade",
  "differential_diagnoses": ["diagnosis1", "diagnosis2"],
  "recommended_biomarkers": ["IDH1/2", "MGMT", "EGFR"],
  "treatment_options": [
    {{"name": "option1", "description": "brief description"}},
    {{"name": "option2", "description": "brief description"}}
  ],
  "prognosis_context": "honest but compassionate prognosis statement",
  "urgency": "emergent/urgent/semi-urgent/elective"
}}""",

    "surgery": """You are an expert neurosurgeon on a tumor board.

Given imaging and oncology findings: {context}

Assess surgical options. Return ONLY valid JSON, no markdown:
{{
  "resectable": true,
  "recommended_approach": "surgical approach name",
  "expected_resection_extent": "gross-total/subtotal/biopsy-only",
  "high_risk_structures": ["structure1", "structure2"],
  "intraop_monitoring": ["motor evoked potentials", "awake craniotomy"],
  "surgical_risk_level": "low/moderate/high",
  "awake_craniotomy_recommended": false,
  "surgical_note": "2 sentence summary of surgical plan"
}}""",

    "radiation": """You are an expert radiation oncologist on a tumor board.

Given imaging and surgical findings: {context}

Propose radiation treatment concept. Return ONLY valid JSON, no markdown:
{{
  "recommended_modality": "IMRT/SRS/SBRT/proton",
  "target_volume_concept": "description of radiation target",
  "total_dose_concept": "dose in Gy and fractions",
  "organs_at_risk": ["brainstem", "optic chiasm", "hippocampus"],
  "treatment_timing": "when to start relative to surgery",
  "concurrent_chemo": true,
  "caution_zones": ["zone1", "zone2"],
  "radiation_note": "2 sentence summary of radiation plan"
}}""",

    "trials": """You are a clinical trials specialist on a tumor board.

Given full tumor profile: {context}

Match to relevant trials. Return ONLY valid JSON, no markdown:
{{
  "matched_trials": [
    {{
      "name": "trial type name",
      "phase": "Phase I/II/III or FDA Approved",
      "rationale": "why this patient might qualify",
      "key_eligibility": "main eligibility requirement",
      "mechanism": "how this treatment works in plain terms"
    }},
    {{
      "name": "trial type 2",
      "phase": "Phase II",
      "rationale": "rationale",
      "key_eligibility": "eligibility",
      "mechanism": "mechanism"
    }},
    {{
      "name": "trial type 3",
      "phase": "Phase III",
      "rationale": "rationale",
      "key_eligibility": "eligibility",
      "mechanism": "mechanism"
    }}
  ],
  "genomic_testing_recommended": true,
  "trials_note": "1 sentence on most promising avenue"
}}""",

    "coordinator": """You are a care coordinator synthesizing a full tumor board meeting.

Given ALL specialist findings: {context}

Create the final tumor board output. Return ONLY valid JSON, no markdown:
{{
  "multidisciplinary_consensus": "one sentence overall recommendation",
  "doctor_report": {{
    "clinical_summary": "3-4 sentence clinical summary for physician",
    "immediate_next_steps": ["step1", "step2", "step3", "step4"],
    "timeline": "expected timeline of care",
    "key_decision_points": ["decision1", "decision2"]
  }},
  "patient_report": {{
    "plain_english_summary": "2-3 sentence compassionate explanation for patient",
    "what_happens_next": ["step1 in plain language", "step2", "step3"],
    "questions_to_ask_doctor": [
      "Question 1?",
      "Question 2?",
      "Question 3?"
    ],
    "support_resources": ["resource1", "resource2"]
  }},
  "urgency_flag": "routine/urgent/emergent"
}}"""
}


async def run_agent(agent_name: str, context: dict) -> dict:
    """Run a single agent with Gemini"""
    prompt = AGENT_PROMPTS[agent_name].format(
        context=json.dumps(context, indent=2),
        volume_cc=context.get("volume_cc", 0)
    )

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Strip markdown if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw_response": response.text, "parse_error": True}
    except Exception as e:
        return {"error": str(e)}


async def run_tumor_board(tumor_context: dict) -> dict:
    """
    Orchestrate all 6 agents sequentially.
    Each agent receives the full context including previous agents' findings.
    """
    results = {}
    running_context = {**tumor_context}

    agents_in_order = [
        "radiology",
        "oncology",
        "surgery",
        "radiation",
        "trials",
        "coordinator"
    ]

    for agent_name in agents_in_order:
        print(f"Running {agent_name} agent...")
        result = await run_agent(agent_name, running_context)
        results[agent_name] = result

        # Each agent sees previous findings
        running_context[f"{agent_name}_findings"] = result

        # Small delay to avoid rate limiting
        await asyncio.sleep(0.5)

    return results
