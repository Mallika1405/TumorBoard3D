export function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale = size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-xl";
  const tag = size === "lg" ? "text-lg" : size === "sm" ? "text-[10px]" : "text-xs";
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <span className="pulse-dot" />
      </div>
      <span className={`font-serif italic ${scale} tracking-tight text-foreground leading-none`}>
        Consilium
        <span className={`not-italic font-mono ${tag} ml-1.5 text-primary tracking-widest`}>AI</span>
      </span>
    </div>
  );
}
