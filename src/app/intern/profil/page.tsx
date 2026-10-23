import { certificateFonts } from "@/components/certificate/certificate-preview";
import { SignatureSample } from "@/components/certificate/signature-mark";
import { requireUser } from "@/lib/server/auth/dal";
import { ROLE_LABEL } from "@/lib/server/db/types";
import { ServiceNameForm } from "../forms";

// Depends on the signed-in user: rendered per request (see intern/layout.tsx).
export const instant = false;

export default async function ProfilPage() {
  const user = await requireUser();

  return (
    <section className="glass-panel p-8 sm:p-10">
      <h1 className="font-serif text-4xl font-medium">Profil</h1>
      <dl className="mt-6 grid max-w-md grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-[0.9375rem]">
        <dt className="text-muted">Discord</dt>
        <dd>{user.discordName}</dd>
        <dt className="text-muted">Rolle</dt>
        <dd>{user.roles.map((role) => ROLE_LABEL[role]).join(", ")}</dd>
      </dl>
      <ServiceNameForm current={user.serviceName ?? ""} />

      <div className={`mt-10 max-w-md border-t border-ink/10 pt-8 ${certificateFonts}`}>
        <h2 className="font-serif text-2xl font-medium">Deine Unterschrift</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          Jeder Amtsträger hat eine eigene Handschrift. Auf jeder Urkunde fällt sie ein wenig anders aus, so wie niemand
          zweimal genau gleich unterschreibt.
        </p>
        <div className="mt-4 rounded-2xl border border-ink/10 bg-white/60 px-4 py-4">
          <SignatureSample name={user.serviceName ?? "Dein Dienstname"} seed={user.id.length * 977 + 11} signerKey={user.id} scale={1.2} />
        </div>
      </div>
    </section>
  );
}
