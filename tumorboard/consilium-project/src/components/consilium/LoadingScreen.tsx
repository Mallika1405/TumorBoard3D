import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ORDER, AGENTS, type AgentName } from "@/lib/consilium";
import { Brand } from "./Brand";

type Props = {
  current: AgentName | null;
  completed: Set<AgentName>;
  done: boolean;
  onView: () => void;
};

const PHRASES = [
  "Cross-referencing imaging characteristics",
  "Estimating WHO grade probabilities",
  "Mapping eloquent cortex proximity",
  "Modelling resection trajectories",
  "Querying NCI trial registry",
  "Synthesizing multidisciplinary consensus",
];

export function LoadingScreen({ current, completed, done, onView }: Props) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES.length), 1800);
    return () => clearInterval(t);
  }, []);

  const progress = (completed.size / ORDER.length) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <Brand />
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-primary">
          <span className="pulse-dot" />
          Board in session
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Center orb with rotating ring of agents */}
        <div className="relative h-[420px] w-[420px] flex items-center justify-center">
          {/* Outer rotating ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            {ORDER.map((name, i) => {
              const angle = (i / ORDER.length) * 2 * Math.PI - Math.PI / 2;
              const x = Math.cos(angle) * 180;
              const y = Math.sin(angle) * 180;
              const isCurrent = current === name;
              const isDone = completed.has(name);
              return (
                <motion.div
                  key={name}
                  className="absolute left-1/2 top-1/2"
                  style={{ x, y }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                >
                  <div
                    className={`-translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] transition-all ${
                      isCurrent
                        ? "scale-110 border-primary bg-primary/10 text-foreground shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
                        : isDone
                        ? "border-hairline surface-2 text-muted-foreground"
                        : "border-hairline/50 text-muted-foreground/50"
                    }`}
                    style={{
                      borderColor: isCurrent ? `hsl(var(--${AGENTS[name].tone}))` : undefined,
                      color: isCurrent ? `hsl(var(--${AGENTS[name].tone}))` : undefined,
                    }}
                  >
                    {AGENTS[name].label}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Pulsing center */}
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full"
              style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)", width: 220, height: 220, left: -110, top: -110 }}
            />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full glass shadow-elev">
              <div className="text-center">
                <div className="font-serif text-3xl text-gradient">{completed.size}<span className="text-muted-foreground/50">/6</span></div>
                <div className="label-eyebrow mt-1">Agents</div>
              </div>
            </div>
          </div>
        </div>

        {/* Status text */}
        <motion.div
          key={phraseIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 text-center"
        >
          <div className="font-serif text-3xl tracking-tight">
            {done ? "Consensus reached." : `${PHRASES[phraseIdx]}…`}
          </div>
          <div className="mt-2 label-eyebrow">
            {done ? "Your clinical report is ready" : current ? `${AGENTS[current].label} reviewing` : "Initialising"}
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="mt-10 w-full max-w-md">
          <div className="h-px bg-hairline overflow-hidden rounded-full">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-primary"
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>Convening</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {done && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onView}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-elev transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
          >
            View clinical report →
          </motion.button>
        )}
      </main>
    </div>
  );
}
