export function AmbientBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
           style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 60%)" }} />
      <div className="absolute bottom-0 right-0 h-[500px] w-[700px] rounded-full blur-3xl"
           style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.10), transparent 60%)" }} />
    </div>
  );
}
