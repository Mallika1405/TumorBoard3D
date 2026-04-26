import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Image as ImageIcon, ArrowRight, ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import { API, type CaseInputs } from "@/lib/consilium";
import { Brand } from "./Brand";

type Props = {
  inputs: CaseInputs;
  setInputs: (u: Partial<CaseInputs>) => void;
  onBack: () => void;
  onContinue: () => void;
  onToast: (msg: string, ok?: boolean) => void;
};

const LOCATIONS = [
  "right temporal lobe", "left temporal lobe",
  "right frontal lobe", "left frontal lobe",
  "right parietal lobe", "left parietal lobe",
  "cerebellum", "brainstem",
];

export function UploadScreen({ inputs, setInputs, onBack, onContinue, onToast }: Props) {
  const mriRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<null | "mri" | "pdf">(null);
  const [done, setDone] = useState<null | "mri" | "pdf">(null);

  async function handleFile(file: File | undefined, kind: "mri" | "pdf") {
    if (!file) return;
    setBusy(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/${kind === "mri" ? "analyze-mri" : "parse-pdf"}`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const patch: Partial<CaseInputs> = {};
      if (data.volume_cc) patch.volume = data.volume_cc;
      if (data.location) patch.location = data.location;
      if (data.patient_age) patch.age = data.patient_age;
      if (data.patient_sex) patch.sex = data.patient_sex;
      if (data.notes) patch.notes = data.notes;
      setInputs(patch);
      setDone(kind);
      onToast(kind === "mri" ? "MRI analyzed — fields populated" : "Report parsed — fields populated");
    } catch (e: any) {
      onToast(`${kind.toUpperCase()} failed — ${e.message ?? "backend unreachable"}`, false);
    } finally {
      setBusy(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type === "application/pdf") handleFile(file, "pdf");
    else if (file.type.startsWith("image/")) handleFile(file, "mri");
  }

  const ready = inputs.volume || inputs.location || inputs.age;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <Brand />
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3 h-3" /> Back
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-10">
            <div className="label-eyebrow mb-3">Step 01 — Intake</div>
            <h1 className="font-serif text-5xl md:text-6xl tracking-tight">
              Upload the <span className="italic text-gradient">case</span>.
            </h1>
            <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto">
              Drop a radiology PDF or MRI image. We'll extract patient details and tumor measurements automatically.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`relative overflow-hidden rounded-3xl glass shadow-elev transition-all ${
              dragging ? "ring-2 ring-primary scale-[1.01]" : ""
            }`}
          >
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="relative p-12 text-center">
              <input ref={mriRef} type="file" accept="image/*" className="hidden"
                     onChange={(e) => handleFile(e.target.files?.[0], "mri")} />
              <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
                     onChange={(e) => handleFile(e.target.files?.[0], "pdf")} />

              <AnimatePresence mode="wait">
                {busy ? (
                  <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="flex flex-col items-center gap-4 py-8">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" strokeWidth={1.5} />
                    <div className="font-serif text-2xl">Analyzing with Gemini…</div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {busy === "mri" ? "Reading imaging characteristics" : "Parsing radiology report"}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border hairline surface-2">
                      <Upload className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="font-serif text-3xl mb-2">Drop a file to begin</div>
                    <div className="text-xs text-muted-foreground mb-8">
                      PDF radiology reports or MRI images · up to 50 MB
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => mriRef.current?.click()}
                              className="group flex items-center gap-2 rounded-xl border hairline surface-2 px-5 py-3 text-xs uppercase tracking-[0.18em] text-foreground transition-all hover:border-radiology/50 hover:bg-radiology/5">
                        <ImageIcon className="w-4 h-4 text-radiology" strokeWidth={1.5} />
                        Upload MRI Scan
                      </button>
                      <button onClick={() => pdfRef.current?.click()}
                              className="group flex items-center gap-2 rounded-xl border hairline surface-2 px-5 py-3 text-xs uppercase tracking-[0.18em] text-foreground transition-all hover:border-oncology/50 hover:bg-oncology/5">
                        <FileText className="w-4 h-4 text-oncology" strokeWidth={1.5} />
                        Upload Radiology Report
                      </button>
                    </div>

                    {done && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                  className="mt-6 inline-flex items-center gap-2 text-[11px] text-trials">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {done === "mri" ? "MRI" : "Report"} processed
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Manual entry */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-hairline" />
              <span className="label-eyebrow">Or enter manually</span>
              <div className="h-px flex-1 bg-hairline" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Volume (cc)">
                <input type="number" step="0.1" placeholder="e.g. 28.4"
                       value={inputs.volume ?? ""}
                       onChange={(e) => setInputs({ volume: e.target.value ? parseFloat(e.target.value) : null })}
                       className="field" />
              </Field>
              <Field label="Age">
                <input type="number" placeholder="e.g. 58"
                       value={inputs.age ?? ""}
                       onChange={(e) => setInputs({ age: e.target.value ? parseInt(e.target.value) : null })}
                       className="field" />
              </Field>
              <Field label="Sex">
                <select value={inputs.sex} onChange={(e) => setInputs({ sex: e.target.value })} className="field">
                  <option>Male</option><option>Female</option>
                </select>
              </Field>
              <Field label="Location">
                <select value={inputs.location} onChange={(e) => setInputs({ location: e.target.value })} className="field">
                  <option value="">Select…</option>
                  {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
            </div>

            {inputs.notes && (
              <div className="mt-5 rounded-xl surface-2 border hairline p-4">
                <div className="label-eyebrow mb-2">Parsed Notes</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{inputs.notes}</p>
              </div>
            )}
          </div>

          {/* Continue */}
          <div className="mt-10 flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground">
              {ready ? (
                <span className="text-trials">● Ready to convene</span>
              ) : (
                "Add at least one detail to continue"
              )}
            </div>
            <button
              onClick={onContinue}
              disabled={!ready}
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-elev transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] disabled:opacity-30 disabled:hover:scale-100 disabled:hover:shadow-elev disabled:cursor-not-allowed"
            >
              Convene Board
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </main>

      <style>{`
        .field {
          width: 100%;
          background: hsl(var(--surface-2));
          border: 1px solid hsl(var(--hairline));
          color: hsl(var(--foreground));
          padding: 11px 13px;
          border-radius: 10px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          outline: none;
          transition: all 0.2s;
        }
        .field:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="label-eyebrow mb-2">{label}</div>
      {children}
    </label>
  );
}
