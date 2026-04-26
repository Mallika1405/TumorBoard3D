import json
import os
import base64
import fitz
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from google import genai
from google.genai import types
from dotenv import load_dotenv
from pydantic import BaseModel
from datetime import datetime
import pathlib

load_dotenv()

app = FastAPI(title="TumorBoard3D API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

asi1 = OpenAI(base_url="https://api.asi1.ai/v1", api_key=os.getenv("ASI1_API_KEY"))
gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

CASES_FILE = pathlib.Path("cases.json")
if not CASES_FILE.exists():
    CASES_FILE.write_text("[]")

def save_case(data):
    cases = json.loads(CASES_FILE.read_text())
    cases.insert(0, data)
    CASES_FILE.write_text(json.dumps(cases[:50], indent=2))

def load_cases():
    return json.loads(CASES_FILE.read_text())

class TumorCase(BaseModel):
    volume_cc: float = 28.4
    location: str = "right temporal lobe"
    patient_age: int = 58
    patient_sex: str = "Male"
    notes: str = ""

class ChatMessage(BaseModel):
    message: str
    tumor_context: dict = {}
    history: list = []

AGENTS = {
    "radiology":   {"system": "You are an expert neuroradiologist on a tumor board. Return ONLY valid JSON: location, volume_cc, shape_description, nearest_critical_structures (array), edema_present (bool), enhancement_pattern, mass_effect, key_finding, imaging_grade_suggestion.", "user": lambda c: f"Analyze: {json.dumps(c)}"},
    "oncology":    {"system": "You are an expert neuro-oncologist. Return ONLY valid JSON: likely_diagnosis, differential_diagnoses (array), recommended_biomarkers (array), treatment_options (array name+description), prognosis_context, urgency.", "user": lambda c: f"Assess: {json.dumps(c)}"},
    "surgery":     {"system": "You are an expert neurosurgeon. Return ONLY valid JSON: resectable (bool), recommended_approach, expected_resection_extent, high_risk_structures (array), intraop_monitoring (array), awake_craniotomy_recommended (bool), surgical_risk_level, surgical_note.", "user": lambda c: f"Assess surgery: {json.dumps(c)}"},
    "radiation":   {"system": "You are an expert radiation oncologist. Return ONLY valid JSON: recommended_modality, target_volume_concept, total_dose_concept, organs_at_risk (array), treatment_timing, concurrent_chemo (bool), concurrent_agent, caution_zones (array), radiation_note.", "user": lambda c: f"Plan radiation: {json.dumps(c)}"},
    "trials":      {"system": "You are a clinical trials specialist. Return ONLY valid JSON: matched_trials (array: name/phase/rationale/key_eligibility/mechanism), genomic_testing_recommended (bool), priority_tests (array), trials_note.", "user": lambda c: f"Match trials: {json.dumps(c)}"},
    "coordinator": {"system": "You are a care coordinator. Return ONLY valid JSON: multidisciplinary_consensus, urgency_flag, doctor_report (clinical_summary, immediate_next_steps array, timeline), patient_report (plain_english_summary, what_happens_next array, questions_to_ask_doctor array).", "user": lambda c: f"Synthesize: {json.dumps(c)}"},
}

def call_asi1(system: str, user: str) -> dict:
    try:
        r = asi1.chat.completions.create(
            model="asi1",
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            max_tokens=1500,
        )
        text = r.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"): text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        return {"error": str(e)}

# ── Route 1: Analyze MRI image with Gemini Vision ────────────────────────────
@app.post("/analyze-mri")
async def analyze_mri(file: UploadFile = File(...)):
    """Gemini Vision analyzes uploaded MRI/CT image"""
    content = await file.read()
    b64 = base64.standard_b64encode(content).decode()
    mime = file.content_type or "image/jpeg"

    try:
        response = gemini.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=base64.standard_b64decode(b64), mime_type=mime),
                types.Part.from_text(text="""You are an expert neuroradiologist analyzing a brain MRI or CT scan.
Examine this image carefully and extract any visible tumor or abnormality information.
Return ONLY valid JSON with these fields (use your best clinical estimate, null if truly cannot determine):
{
  "volume_cc": <estimated volume in cc as number, e.g. 15.2>,
  "location": <brain region as string e.g. "right temporal lobe">,
  "enhancement_pattern": <e.g. "ring-enhancing">,
  "key_finding": <one sentence clinical description>,
  "imaging_grade_suggestion": <"low-grade" or "high-grade">,
  "notes": <any other important findings as string>
}""")
            ]
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"): text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        return {"error": str(e)}

# ── Route 2: Parse PDF report ────────────────────────────────────────────────
@app.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    """Extract tumor info from radiology PDF using Gemini"""
    content = await file.read()
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        text = "".join(page.get_text() for page in doc)
    except:
        return {"error": "Could not read PDF"}

    try:
        response = gemini.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"""Extract tumor information from this radiology report and return ONLY valid JSON:
{{
  "volume_cc": <number or null>,
  "location": <string or null>,
  "patient_age": <number or null>,
  "patient_sex": <"Male" or "Female" or null>,
  "notes": <key findings as string>
}}

Report:
{text[:4000]}"""
        )
        text_r = response.text.strip()
        if text_r.startswith("```"):
            text_r = text_r.split("```")[1]
            if text_r.startswith("json"): text_r = text_r[4:]
        return json.loads(text_r.strip())
    except Exception as e:
        return {"error": str(e)}

# ── Route 3: Patient chatbot powered by Gemini ───────────────────────────────
@app.post("/chat")
async def patient_chat(msg: ChatMessage):
    """Gemini-powered patient Q&A using tumor board context"""
    context_str = json.dumps(msg.tumor_context, indent=2) if msg.tumor_context else "No tumor board results yet."

    system = f"""You are a compassionate medical assistant helping a patient understand their brain tumor diagnosis and treatment plan.
You have access to their tumor board results below. Answer their questions clearly, honestly, and in plain English.
Never give definitive medical advice — always encourage them to discuss with their doctor.
Keep responses concise (3-5 sentences max).

Tumor Board Results:
{context_str}"""

    # Build conversation history
    messages = [{"role": "system", "content": system}]
    for h in msg.history[-6:]:  # last 6 messages
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": msg.message})

    try:
        # Use Gemini for the chat
        history_text = "\n".join([f"{h['role'].upper()}: {h['content']}" for h in msg.history[-4:]])
        prompt = f"{system}\n\n{history_text}\n\nPATIENT: {msg.message}\n\nASSISTANT:"
        response = gemini.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return {"response": response.text.strip()}
    except Exception as e:
        return {"response": f"I'm sorry, I couldn't process that. Please try again. ({e})"}

# ── Route 4: Run full tumor board ────────────────────────────────────────────
@app.post("/run")
async def run_tumor_board(case: TumorCase):
    context = case.model_dump()
    results = {}
    for name in ["radiology", "oncology", "surgery", "radiation", "trials", "coordinator"]:
        agent = AGENTS[name]
        result = call_asi1(agent["system"], agent["user"](context))
        results[name] = result
        context[f"{name}_findings"] = result

    save_case({"id": datetime.now().isoformat(), "case": case.model_dump(), "results": results, "timestamp": datetime.now().isoformat()})
    return {"status": "complete", "case": case.model_dump(), "agents": results}

@app.get("/cases")
async def get_cases():
    return load_cases()

# ── Route 5: Export PDF report ────────────────────────────────────────────────
class ExportRequest(BaseModel):
    case: dict = {}
    agents: dict = {}

@app.post("/export-pdf")
async def export_pdf(req: ExportRequest):
    """Generate a clean clinical PDF report from tumor board results"""
    from fastapi.responses import Response
    
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4
    
    # Colors
    RED = (0.86, 0.15, 0.15)
    DARK = (0.05, 0.05, 0.1)
    MID = (0.35, 0.4, 0.5)
    LIGHT = (0.75, 0.8, 0.87)
    
    y = 48
    margin = 48
    width = 595 - margin * 2
    
    def text(page, x, y, t, size=10, color=DARK, bold=False):
        fontname = "helv" if not bold else "hebo"
        page.insert_text((x, y), t, fontsize=size, color=color, fontname=fontname)
        return y + size + 4

    def line(page, y, color=MID, thickness=0.5):
        page.draw_line((margin, y), (595 - margin, y), color=color, width=thickness)
        return y + 8

    def wrap_text(page, x, y, t, size=9, color=MID, max_width=499):
        """Simple text wrap"""
        words = str(t).split()
        lines = []
        current = ""
        for word in words:
            test = current + (" " if current else "") + word
            if len(test) * size * 0.55 > max_width:
                if current:
                    lines.append(current)
                current = word
            else:
                current = test
        if current:
            lines.append(current)
        for l in lines:
            page.insert_text((x, y), l, fontsize=size, color=color, fontname="helv")
            y += size + 3
        return y + 4

    # Header bar
    page.draw_rect(fitz.Rect(0, 0, 595, 72), color=DARK, fill=DARK)
    page.insert_text((margin, 32), "CONSILIUM", fontsize=18, color=(1,1,1), fontname="hebo")
    page.insert_text((margin, 50), "AI  ·  MULTI-AGENT TUMOR BOARD REPORT", fontsize=8, color=(0.4, 0.45, 0.55), fontname="helv")
    
    ts = datetime.now().strftime("%B %d, %Y  ·  %H:%M")
    page.insert_text((595 - margin - 120, 42), ts, fontsize=8, color=(0.4, 0.45, 0.55), fontname="helv")

    y = 92

    # Patient info bar
    case = req.case
    info_parts = []
    if case.get("patient_age"): info_parts.append(f"Age: {case['patient_age']}")
    if case.get("patient_sex"): info_parts.append(f"Sex: {case['patient_sex']}")
    if case.get("volume_cc"): info_parts.append(f"Volume: {case['volume_cc']} cc")
    if case.get("location"): info_parts.append(f"Location: {case['location'].title()}")
    
    if info_parts:
        page.draw_rect(fitz.Rect(margin, y-6, 595-margin, y+22), color=(0.06,0.08,0.14), fill=(0.06,0.08,0.14))
        page.insert_text((margin+10, y+10), "  ·  ".join(info_parts), fontsize=9, color=LIGHT, fontname="helv")
        y += 36

    agents = req.agents
    coord = agents.get("coordinator", {})

    # Consensus box
    if coord.get("multidisciplinary_consensus"):
        y += 8
        urgency = coord.get("urgency_flag", "").upper()
        uc = RED if "urgent" in urgency.lower() or "emergent" in urgency.lower() else (0.18, 0.72, 0.56)
        page.draw_rect(fitz.Rect(margin, y, 595-margin, y+14), color=uc, fill=uc)
        page.insert_text((margin+8, y+10), f"{urgency}  —  MULTIDISCIPLINARY CONSENSUS", fontsize=7, color=(1,1,1), fontname="hebo")
        y += 20
        page.draw_rect(fitz.Rect(margin, y, 595-margin, y+2), color=(0.1,0.12,0.2), fill=(0.1,0.12,0.2))
        y += 10
        y = wrap_text(page, margin, y, coord["multidisciplinary_consensus"], size=10, color=(0.2,0.25,0.35))
        y += 8
        y = line(page, y)

    # Specialist findings
    agent_order = [
        ("radiology", "RADIOLOGY", (0.36, 0.61, 0.98), ["location", "volume_cc", "enhancement_pattern", "key_finding", "imaging_grade_suggestion"]),
        ("oncology", "ONCOLOGY", (0.69, 0.44, 0.99), ["likely_diagnosis", "prognosis_context", "urgency"]),
        ("surgery", "NEUROSURGERY", (0.98, 0.40, 0.40), ["resectable", "recommended_approach", "surgical_risk_level", "surgical_note"]),
        ("radiation", "RADIATION ONCOLOGY", (0.99, 0.75, 0.21), ["recommended_modality", "total_dose_concept", "treatment_timing"]),
        ("trials", "CLINICAL TRIALS", (0.35, 0.88, 0.68), ["trials_note", "priority_tests"]),
    ]

    for agent_key, agent_label, color, fields in agent_order:
        data = agents.get(agent_key, {})
        if not data or data.get("error"):
            continue

        if y > 740:
            page = doc.new_page(width=595, height=842)
            y = 48

        # Section header
        page.insert_text((margin, y), agent_label, fontsize=9, color=color, fontname="hebo")
        y += 4
        page.draw_line((margin, y), (margin + 80, y), color=color, width=0.8)
        y += 10

        for field in fields:
            val = data.get(field)
            if val is None:
                continue
            if isinstance(val, list):
                val = " · ".join([str(v) if not isinstance(v, dict) else v.get("name", "") for v in val[:4]])
            elif isinstance(val, bool):
                val = "Yes" if val else "No"
            elif isinstance(val, dict):
                val = str(val)

            label = field.replace("_", " ").upper()
            page.insert_text((margin, y), label, fontsize=7, color=(0.3,0.35,0.45), fontname="hebo")
            y += 10
            y = wrap_text(page, margin + 8, y, str(val), size=9, color=(0.5, 0.55, 0.65))

        y += 6
        y = line(page, y, color=(0.08, 0.1, 0.18))

    # Doctor report
    if coord.get("doctor_report"):
        if y > 700:
            page = doc.new_page(width=595, height=842)
            y = 48
        dr = coord["doctor_report"]
        page.insert_text((margin, y), "CLINICAL SUMMARY", fontsize=9, color=(0.36, 0.61, 0.98), fontname="hebo")
        y += 14
        if dr.get("clinical_summary"):
            y = wrap_text(page, margin, y, dr["clinical_summary"], size=9, color=(0.5,0.55,0.65))
        if dr.get("immediate_next_steps"):
            y += 4
            page.insert_text((margin, y), "IMMEDIATE NEXT STEPS", fontsize=7, color=(0.3,0.35,0.45), fontname="hebo")
            y += 12
            for step in dr["immediate_next_steps"][:6]:
                page.insert_text((margin, y), "—", fontsize=9, color=(0.36,0.61,0.98), fontname="helv")
                y = wrap_text(page, margin+14, y, step, size=9, color=(0.5,0.55,0.65), max_width=480)
        y = line(page, y+4)

    # Patient report
    if coord.get("patient_report"):
        if y > 700:
            page = doc.new_page(width=595, height=842)
            y = 48
        pr = coord["patient_report"]
        page.insert_text((margin, y), "FOR THE PATIENT", fontsize=9, color=(0.35, 0.88, 0.68), fontname="hebo")
        y += 14
        if pr.get("plain_english_summary"):
            y = wrap_text(page, margin, y, pr["plain_english_summary"], size=9, color=(0.5,0.55,0.65))
        if pr.get("questions_to_ask_doctor"):
            y += 4
            page.insert_text((margin, y), "QUESTIONS TO ASK YOUR DOCTOR", fontsize=7, color=(0.3,0.35,0.45), fontname="hebo")
            y += 12
            for q in pr["questions_to_ask_doctor"][:5]:
                page.insert_text((margin, y), "?", fontsize=9, color=(0.99,0.83,0.21), fontname="helv")
                y = wrap_text(page, margin+14, y, q, size=9, color=(0.5,0.55,0.65), max_width=480)

    # Footer
    for i in range(len(doc)):
        p = doc[i]
        p.draw_line((margin, 810), (595-margin, 810), color=(0.1,0.12,0.2), width=0.5)
        p.insert_text((margin, 825), f"Consilium AI  ·  Generated {ts}  ·  For clinical decision support only. Not a substitute for professional medical judgment.", 
                      fontsize=6, color=(0.2,0.25,0.35), fontname="helv")
        p.insert_text((595-margin-20, 825), f"{i+1}", fontsize=6, color=(0.2,0.25,0.35), fontname="helv")

    pdf_bytes = doc.tobytes()
    doc.close()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=consilium-report-{datetime.now().strftime('%Y%m%d-%H%M')}.pdf"}
    )

@app.get("/")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)