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
    </section>
  );
}
