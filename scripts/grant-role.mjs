// Grants a role to a Discord user in the local SQLite database.
// Usage: node scripts/grant-role.mjs <discord-id> [role]
// The user must have signed in once, so the account exists. Local development only;
// staging and production get roles inside the app or through the Supabase dashboard.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const ROLES = ["justizminister"];
const [discordId, role = "justizminister"] = process.argv.slice(2);

if (!/^\d{5,25}$/.test(discordId ?? "") || !ROLES.includes(role)) {
  console.error(`Aufruf: node scripts/grant-role.mjs <discord-id> [${ROLES.join("|")}]`);
  process.exit(1);
}

const db = new DatabaseSync(path.join(process.cwd(), ".data", "fjd.sqlite"));
const user = db.prepare("select id, discord_name from users where discord_id = ?").get(discordId);
if (!user) {
  console.error("Kein Konto mit dieser Discord-ID. Die Person muss sich zuerst einmal anmelden.");
  process.exit(1);
}

db.prepare("insert into roles (user_id, role, granted_by, granted_at) values (?, ?, null, ?) on conflict do nothing").run(
  user.id,
  role,
  new Date().toISOString(),
);
console.log(`${user.discord_name} hat jetzt die Rolle ${role}.`);
