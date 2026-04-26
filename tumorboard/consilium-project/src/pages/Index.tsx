import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast as sonner } from "sonner";
import { LandingScreen } from "@/components/consilium/LandingScreen";
import { UploadScreen } from "@/components/consilium/UploadScreen";
import { LoadingScreen } from "@/components/consilium/LoadingScreen";
import { ReportScreen } from "@/components/consilium/ReportScreen";
import { AmbientBg } from "@/components/consilium/AmbientBg";
import { API, ORDER, type AgentName, type CaseInputs } from "@/lib/consilium";

type Screen = "landing" | "upload" | "loading" | "report";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("landing");
  const [inputs, setInputsState] = useState<CaseInputs>({
    volume: null, location: "", age: null, sex: "Male", notes: "",
  });
  const [results, setResults] = useState<Record<string, any>>({});
  const [activeAgent, setActiveAgent] = useState<AgentName | null>(null);
  const [completed, setCompleted] = useState<Set<AgentName>>(new Set());
  const [boardDone, setBoardDone] = useState(false);

  const setInputs = (u: Partial<CaseInputs>) => setInputsState((s) => ({ ...s, ...u }));

  useEffect(() => {
    document.title = "Consilium AI — Multi-Agent Tumor Board";
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); return m;
    })();
    meta.setAttribute("content", "Convene a six-specialist AI tumor board in seconds. Upload an MRI or radiology report and receive a consensus clinical report.");
  }, []);

  function showToast(msg: string, ok = true) {
    if (ok) sonner.success(msg);
    else sonner.error(msg);
  }

  async function runBoard() {
    setScreen("loading");
    setResults({});
    setCompleted(new Set());
    setBoardDone(false);

    // Animate progressive activation while real call runs in parallel
    const apiPromise = fetch(`${API}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volume_cc: inputs.volume || 0,
        location: inputs.location || "unknown",
        patient_age: inputs.age || 0,
        patient_sex: inputs.sex,
        notes: inputs.notes,
      }),
    }).then((r) => r.json()).catch((e) => ({ error: e.message }));

    for (const name of ORDER) {
      setActiveAgent(name);
      await new Promise((r) => setTimeout(r, 900));
      setCompleted((c) => new Set(c).add(name));
    }
    setActiveAgent(null);

    const data = await apiPromise;
    if (data?.error || !data?.agents) {
      showToast("Backend unreachable — start API at localhost:8080", false);
      setScreen("upload");
      return;
    }
    setResults(data.agents);
    setBoardDone(true);
  }

  function newCase() {
    setResults({});
    setCompleted(new Set());
    setBoardDone(false);
    setInputsState({ volume: null, location: "", age: null, sex: "Male", notes: "" });
    setScreen("upload");
  }

  return (
    <div className="relative min-h-screen text-foreground">
      <AmbientBg />
      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <LandingScreen onStart={() => setScreen("upload")} />
          </motion.div>
        )}
        {screen === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
            <UploadScreen
              inputs={inputs}
              setInputs={setInputs}
              onBack={() => setScreen("landing")}
              onContinue={runBoard}
              onToast={showToast}
            />
          </motion.div>
        )}
        {screen === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <LoadingScreen
              current={activeAgent}
              completed={completed}
              done={boardDone}
              onView={() => setScreen("report")}
            />
          </motion.div>
        )}
        {screen === "report" && (
          <motion.div key="report" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <ReportScreen inputs={inputs} results={results} onNewCase={newCase} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
