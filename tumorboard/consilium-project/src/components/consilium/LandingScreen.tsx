import { motion } from "framer-motion";
import { ArrowRight, Brain, FileText, Sparkles, Stethoscope, ShieldCheck, Activity } from "lucide-react";
import { Brand } from "./Brand";

const specialties = [
  { name: "Radiology", color: "radiology" },
  { name: "Oncology", color: "oncology" },
  { name: "Neurosurgery", color: "surgery" },
  { name: "Radiation Oncology", color: "radiation" },
  { name: "Clinical Trials", color: "trials" },
  { name: "Care Coordination", color: "coordinator" },
];

export function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <Brand />
        <div className="flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <a className="hover:text-foreground transition-colors" href="#how">How it works</a>
          <a className="hover:text-foreground transition-colors" href="#panel">Specialists</a>
          <button onClick={onStart} className="text-foreground hover:text-primary transition-colors">
            Launch →
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-2 rounded-full border hairline glass px-4 py-1.5 mb-10"
        >
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Multi-agent neuro-oncology AI
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1 }}
          className="font-serif text-6xl md:text-8xl leading-[0.95] tracking-tight max-w-5xl"
        >
          A board that{" "}
          <span className="italic text-gradient">convenes in seconds,</span>
          <br />
          not <span className="italic">weeks.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-8 max-w-xl text-sm leading-relaxed text-muted-foreground"
        >
          Upload an MRI or radiology report. Six specialist AI agents review the case in parallel
          and deliver a consensus clinical report — with a plain-language summary for the patient.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-10 flex items-center gap-4"
        >
          <button
            onClick={onStart}
            className="group relative inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground shadow-elev transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
          >
            Convene a board
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
          <a
            href="#how"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            See how it works
          </a>
        </motion.div>

        {/* Specialist orbit */}
        <motion.div
          id="panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-24 flex flex-wrap items-center justify-center gap-3 max-w-3xl"
        >
          {specialties.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 + i * 0.08 }}
              className="flex items-center gap-2 rounded-full glass px-4 py-2"
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-${s.color}`} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {s.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Feature strip */}
      <section id="how" className="px-8 pb-16 pt-8">
        <div className="mx-auto grid max-w-5xl gap-px overflow-hidden rounded-2xl border hairline bg-hairline/40 md:grid-cols-3">
          {[
            { icon: FileText, title: "Drop a report", body: "PDF radiology reports or raw MRI scans. We parse, measure, and structure the case automatically." },
            { icon: Brain, title: "Six agents convene", body: "Radiology, Oncology, Surgery, Radiation, Trials, and Care Coordination — running in parallel." },
            { icon: ShieldCheck, title: "Consensus report", body: "A clinician-grade summary plus a patient-friendly explanation, with questions to bring to your doctor." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="surface-1 p-8">
              <Icon className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
              <div className="font-serif text-2xl mb-2">{title}</div>
              <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-5xl items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><Activity className="w-3 h-3" /> Built on Gemini</span>
            <span className="flex items-center gap-2"><Stethoscope className="w-3 h-3" /> Decision support · not diagnosis</span>
          </div>
          <span>© Consilium AI</span>
        </div>
      </section>
    </div>
  );
}
