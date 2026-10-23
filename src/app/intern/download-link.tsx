"use client";

import { toast } from "@/lib/toast";

// Download button that confirms the click, since browsers start downloads without visible feedback.
export function DownloadLink({ href, number }: { href: string; number: string }) {
  return (
    <a
      href={href}
      download
      onClick={() => toast.info("Download gestartet", { description: `${number}.pdf` })}
      className="liquid-solid rounded-full px-6 py-3 text-center text-sm font-medium text-white"
    >
      PDF herunterladen
    </a>
  );
}
