import { requireUser } from "@/lib/server/auth/dal";
import { ROLE_LABEL } from "@/lib/server/db/types";
import { ServiceNameForm } from "../forms";
import { SignatureEditor } from "./signature-editor";

export const instant = false;

export default async function ProfilPage() {
  const user = await requireUser();
  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-serif text-4xl font-medium">Dein Profil</h1>
        <p className="mt-3 text-sm text-ink/65">Dein Dienstname und deine persönliche Unterschrift.</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <section className="glass-panel min-w-0 p-6 sm:p-7">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Dienstausweis</p>
          <h2 className="mt-2 font-serif text-2xl font-medium">{user.discordName}</h2>
          <div className="mt-4 flex flex-wrap gap-1.5">{user.roles.map((role) => <span key={role} className="rounded-full bg-navy/7 px-2.5 py-1 text-xs text-navy">{ROLE_LABEL[role]}</span>)}</div>
          <div className="mt-6 border-t border-ink/10 pt-1"><ServiceNameForm current={user.serviceName ?? ""} honorific={user.honorific ?? ""} /></div>
        </section>
        <SignatureEditor initial={user.signature} name={user.serviceName ?? ""} />
      </div>
    </div>
  );
}
