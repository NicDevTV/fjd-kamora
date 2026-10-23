// Coloured light blobs behind glass surfaces; without them glass just looks grey.
// The layer sticks to the viewport while its parent is visible and is clipped by it.
// The parent needs `relative isolate overflow-clip` for this.
export function GlassBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none sticky top-0 -z-10 -mb-[100lvh] h-[100lvh] overflow-hidden"
    >
      <div className="glass-blob -left-32 top-[6%] size-[44rem] [--blob:rgb(122_34_50/0.5)]" />
      <div className="glass-blob -right-40 top-[34%] size-[42rem] [--blob:rgb(59_110_165/0.5)]" />
      <div className="glass-blob bottom-[-12rem] left-[30%] size-[40rem] [--blob:rgb(47_143_138/0.38)]" />
    </div>
  );
}
