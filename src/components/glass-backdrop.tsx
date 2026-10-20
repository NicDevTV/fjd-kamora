// Coloured light blobs behind glass surfaces; without them glass just looks grey.
// The layer sticks to the viewport while its parent is visible and is clipped by it.
// The parent needs `relative isolate overflow-clip` for this.
export function GlassBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none sticky top-0 -z-10 -mb-[100svh] h-[100svh] overflow-hidden"
    >
      <div className="glass-blob -left-32 top-[6%] size-[36rem] bg-accent/55" />
      <div className="glass-blob -right-40 top-[34%] size-[34rem] bg-[#3b6ea5]/55" />
      <div className="glass-blob bottom-[-12rem] left-[30%] size-[32rem] bg-[#2f8f8a]/40" />
    </div>
  );
}
