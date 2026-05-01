export function BackgroundOrbit() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] bg-[size:88px_88px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <div className="absolute inset-x-0 top-0 h-80 bg-[linear-gradient(100deg,rgba(50,115,255,0.16),transparent_35%,rgba(42,215,180,0.12)_72%,transparent)]" />
      <div className="absolute left-1/2 top-28 h-px w-[78rem] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] opacity-30" />
      <div className="absolute left-1/2 top-56 h-px w-[62rem] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,var(--mint),transparent)] opacity-25" />
    </div>
  );
}
