import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Send, MessageSquare, FileText, ArrowLeft, Download, Printer } from "lucide-react";
import { API, AGENTS, ORDER, type AgentName, type CaseInputs } from "@/lib/consilium";
import { Brand } from "./Brand";

type Props = {
  inputs: CaseInputs;
  results: Record<string, any>;
  onNewCase: () => void;
};

export function ReportScreen({ inputs, results, onNewCase }: Props) {
  const [tab, setTab] = useState<"report" | "panel" | "chat">("report");
  const c = results.coordinator || {};
  const dr = c.doctor_report || {};
  const pr = c.patient_report || {};
  const urgency = (c.urgency_flag || "routine").toLowerCase();
  const urgencyColor =
    urgency.includes("urgent") || urgency.includes("emergent") ? "primary"
    : urgency.includes("routine") ? "trials"
    : "radiation";

  async function exportPDF() {
    try {
      const res = await fetch(`${API}/export-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case: {
            patient_age: inputs.age,
            patient_sex: inputs.sex,
            volume_cc: inputs.volume,
            location: inputs.location,
            notes: inputs.notes,
          },
          agents: results,
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `consilium-report-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF export failed", e);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 glass border-b hairline">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-6">
            <Brand size="sm" />
            <div className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Case</span>
              <span className="text-foreground">{inputs.age ?? "—"}y {inputs.sex}</span>
              <span>·</span>
              <span className="text-foreground">{inputs.location || "—"}</span>
              <span>·</span>
              <span className="text-foreground">{inputs.volume ?? "—"} cc</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onNewCase}
                    className="flex items-center gap-2 rounded-lg border hairline surface-2 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3 h-3" /> New case
            </button>
            <button onClick={() => window.print()}
                    className="flex items-center gap-2 rounded-lg border hairline surface-2 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">
              <Printer className="w-3 h-3" /> Print
            </button>
            <button onClick={exportPDF}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-primary-foreground hover:scale-[1.02] transition-transform">
              <Download className="w-3 h-3" /> Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 md:px-12 py-12 max-w-[1500px] mx-auto w-full">
        {/* Hero — consensus headline */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8">
              <div className="flex items-center gap-3 mb-6">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]`}
                      style={{ borderColor: `hsl(var(--${urgencyColor}) / 0.4)`, color: `hsl(var(--${urgencyColor}))`, background: `hsl(var(--${urgencyColor}) / 0.08)` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(var(--${urgencyColor}))` }} />
                  {c.urgency_flag || "Routine"}
                </span>
                <span className="label-eyebrow">Multidisciplinary Consensus</span>
              </div>
              <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] tracking-tight">
                {c.multidisciplinary_consensus || "Consensus pending."}
              </h1>
            </div>
            <div className="md:col-span-4">
              <div className="rounded-2xl glass p-6 shadow-elev">
                <div className="label-eyebrow mb-4">Case Overview</div>
                <dl className="space-y-3 text-xs">
                  <Row label="Patient">{inputs.age ?? "—"} y · {inputs.sex}</Row>
                  <Row label="Location">{inputs.location || "—"}</Row>
                  <Row label="Tumor volume">{inputs.volume ?? "—"} cc</Row>
                  <Row label="Diagnosis">{results.oncology?.likely_diagnosis || "—"}</Row>
                  <Row label="Surgical risk">{results.surgery?.surgical_risk_level || "—"}</Row>
                </dl>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Tabs */}
        <div className="border-b hairline mb-10 flex items-center gap-8">
          {([
            ["report", "Clinical Report", FileText],
            ["panel", "Specialist Panel", MessageSquare],
            ["chat", "Patient Q&A", MessageSquare],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-2 pb-4 text-[11px] uppercase tracking-[0.2em] transition-colors ${
                tab === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {tab === id && (
                <motion.div layoutId="tab-underline" className="absolute -bottom-px left-0 right-0 h-px bg-primary" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "report" && (
            <motion.div key="r" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ReportContent dr={dr} pr={pr} />
            </motion.div>
          )}
          {tab === "panel" && (
            <motion.div key="p" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PanelContent results={results} />
            </motion.div>
          )}
          {tab === "chat" && (
            <motion.div key="c" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ChatContent tumorContext={results} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b hairline pb-2 last:border-0 last:pb-0">
      <dt className="label-eyebrow">{label}</dt>
      <dd className="text-foreground text-right">{children}</dd>
    </div>
  );
}

/* ── Report tab ── */
function ReportContent({ dr, pr }: { dr: any; pr: any }) {
  return (
    <div className="grid md:grid-cols-2 gap-12">
      <article className="space-y-10">
        <SectionHead eyebrow="For the clinician" title="Clinical Summary" />
        <p className="font-serif text-xl leading-relaxed text-foreground/90 first-letter:font-serif first-letter:text-5xl first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-primary">
          {dr.clinical_summary || "No clinical summary available."}
        </p>

        {dr.immediate_next_steps?.length > 0 && (
          <div>
            <div className="label-eyebrow mb-4">Immediate next steps</div>
            <ol className="space-y-3">
              {dr.immediate_next_steps.map((s: string, i: number) => (
                <li key={i} className="flex gap-4 items-start text-sm leading-relaxed text-foreground/85">
                  <span className="font-serif text-2xl text-primary leading-none mt-0.5">{(i + 1).toString().padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {dr.timeline && (
          <div className="rounded-xl border hairline surface-2 p-5">
            <div className="label-eyebrow mb-2">Timeline</div>
            <div className="text-sm text-muted-foreground">
              {typeof dr.timeline === "string" ? dr.timeline : JSON.stringify(dr.timeline)}
            </div>
          </div>
        )}
      </article>

      <article className="space-y-10 md:border-l md:border-hairline md:pl-12">
        <SectionHead eyebrow="For the patient" title="Plain-language Summary" tone="trials" />
        <p className="font-serif text-xl leading-relaxed text-foreground/90">
          {pr.plain_english_summary || "No patient summary available."}
        </p>

        {pr.what_happens_next?.length > 0 && (
          <div>
            <div className="label-eyebrow mb-4">What happens next</div>
            <ul className="space-y-3">
              {pr.what_happens_next.map((s: string, i: number) => (
                <li key={i} className="flex gap-3 items-start text-sm leading-relaxed text-muted-foreground">
                  <span className="text-trials mt-1.5">●</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pr.questions_to_ask_doctor?.length > 0 && (
          <div className="rounded-2xl border border-radiation/30 bg-radiation/5 p-6">
            <div className="label-eyebrow mb-4 text-radiation">Questions to ask your doctor</div>
            <ul className="space-y-3">
              {pr.questions_to_ask_doctor.map((q: string, i: number) => (
                <li key={i} className="flex gap-3 items-start text-sm leading-relaxed text-foreground/90">
                  <span className="font-serif italic text-radiation">Q.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  );
}

function SectionHead({ eyebrow, title, tone = "primary" }: { eyebrow: string; title: string; tone?: string }) {
  return (
    <header>
      <div className={`label-eyebrow mb-2`} style={{ color: `hsl(var(--${tone}))` }}>{eyebrow}</div>
      <h2 className="font-serif text-3xl md:text-4xl tracking-tight">{title}</h2>
    </header>
  );
}

/* ── Panel tab ── */
function PanelContent({ results }: { results: Record<string, any> }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {ORDER.map((name) => (
        <AgentCard key={name} name={name} data={results[name]} />
      ))}
    </div>
  );
}

function AgentCard({ name, data }: { name: AgentName; data: any }) {
  const [open, setOpen] = useState(false);
  const meta = AGENTS[name];
  const hasData = data && !data.error;

  const preview =
    hasData && (data.key_finding || data.likely_diagnosis || data.multidisciplinary_consensus ||
                data.trials_note || data.radiation_note || data.surgical_note);

  return (
    <motion.div layout
      onClick={() => hasData && setOpen((o) => !o)}
      className={`group rounded-2xl border hairline surface-1 overflow-hidden transition-all ${hasData ? "cursor-pointer hover:border-foreground/20" : "opacity-50"}`}
      style={{ borderColor: open ? `hsl(var(--${meta.tone}) / 0.4)` : undefined }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: `hsl(var(--${meta.tone}))`, boxShadow: `0 0 8px hsl(var(--${meta.tone}) / 0.6)` }} />
              <span className="text-[11px] uppercase tracking-[0.2em] text-foreground">{meta.label}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{meta.blurb}</div>
          </div>
          {hasData && (
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          )}
        </div>

        {preview && !open && (
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{preview}</p>
        )}
        {data?.error && <p className="text-xs text-destructive">Analysis failed</p>}

        <AnimatePresence>
          {open && hasData && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t hairline space-y-3">
                {meta.fields.map((f) => renderField(f, data[f], meta.tone))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function renderField(key: string, val: any, tone: string) {
  if (val === undefined || val === null || val === "") return null;
  let body: React.ReactNode;
  if (Array.isArray(val)) {
    if (!val.length) return null;
    if (typeof val[0] === "object") {
      body = (
        <div className="space-y-2">
          {val.slice(0, 3).map((item: any, i: number) => (
            <div key={i} className="rounded-lg surface-2 p-3">
              {item.name && (
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: `hsl(var(--${tone}))` }}>
                  {item.name}{item.phase ? ` · ${item.phase}` : ""}
                </div>
              )}
              <div className="text-xs text-muted-foreground leading-relaxed">{item.rationale || item.description || ""}</div>
            </div>
          ))}
        </div>
      );
    } else {
      body = <div className="text-xs text-foreground/80 leading-relaxed">{val.join(" · ")}</div>;
    }
  } else if (typeof val === "boolean") {
    body = <div className="text-xs" style={{ color: val ? "hsl(var(--trials))" : "hsl(var(--destructive))" }}>{val ? "Yes" : "No"}</div>;
  } else {
    body = <div className="text-xs text-foreground/80 leading-relaxed">{typeof val === "object" ? JSON.stringify(val) : String(val)}</div>;
  }
  return (
    <div key={key}>
      <div className="text-[9px] uppercase tracking-[0.2em] mb-1.5 opacity-70" style={{ color: `hsl(var(--${tone}))` }}>
        {key.replace(/_/g, " ")}
      </div>
      {body}
    </div>
  );
}

/* ── Chat tab ── */
function ChatContent({ tumorContext }: { tumorContext: any }) {
  const [msgs, setMsgs] = useState<Array<{ role: "assistant" | "user"; content: string }>>([
    { role: "assistant", content: "How can I help you understand your diagnosis today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, tumor_context: tumorContext, history: msgs.slice(-6) }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.response }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-2xl border hairline surface-1 shadow-elev overflow-hidden flex flex-col" style={{ height: "min(70vh, 700px)" }}>
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                    : "surface-2 border hairline rounded-2xl rounded-bl-sm text-foreground/90"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex">
              <div className="surface-2 border hairline rounded-2xl rounded-bl-sm px-4 py-3">
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                             className="text-muted-foreground tracking-widest">···</motion.span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t hairline p-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about your diagnosis…"
            className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={send} disabled={loading || !input.trim()}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-30 transition-opacity">
            <Send className="w-3 h-3" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}