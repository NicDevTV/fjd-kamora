// Shared transitions for page content. Going forward slides content to the left,
// going back slides it to the right. Navigation without a direction (browser back/forward) does not animate.
export const pageTransition = {
  enter: {
    "nav-forward": "nav-forward",
    "nav-back": "nav-back",
    default: "none",
  },
  exit: {
    "nav-forward": "nav-forward",
    "nav-back": "nav-back",
    default: "none",
  },
} as const;
