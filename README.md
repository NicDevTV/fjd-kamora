# Federal Justice Department (FJD)

Website of the fictional Federal Justice Department for the **Kamora-V** roleplay server.
The department, its emblem and the legal codex are invented for roleplay and have no connection
to any real government, justice authority or institution.

## What's inside

- **Home page** with a 3D glass emblem (WebGL), a scroll-driven walkthrough of the procedure path,
  the department's offices and the hierarchy of norms.
- **Rechtskodex** (`/rechtskodex`): the full legal codex of Kamora, rendered from
  `content/rechtskodex-kamora-v1.md`, with instant search, cross-reference links, abbreviation
  tooltips and a table of contents that follows your reading position.

The codex is read at build time and served as a static page; changing it means editing the
Markdown file and deploying again.

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev      # http://localhost:3000
bun run lint
bun run test
bun run build
```

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, React Three Fiber + drei, Motion, react-markdown.
Deployed on Vercel.

## Amtsblatt and internal documents

Only explicitly approved appointments, dismissals, promotions and oaths may be
announced in Discord. The Components V2 message includes a large PNG certificate
excerpt rendered exclusively from public facts and completed signatures;
it uses the same PDF renderer as the original certificate rather than a separate
Discord layout. The server bundles PDF.js and its worker for PNG rasterization;
reasons, private case details and complete PDFs stay in the authenticated app.
Pending or rejected documents are never announced. The final required approval
triggers publication, with an atomic database claim against duplicate delivery.
An unsuccessful webhook response releases the claim for a later retry; there is
currently no background delivery queue. Existing Discord posts are not removed.

The document list supports text search and combined area, publication and status
filters. The `ogh_richter` Discord mapping distinguishes OGH members from district
judges. Ordinary panel decisions and mandatory unanimous decisions use the issuing
judge plus two different OGH countersigners. Nobody can fill two positions.
Emergency OGH decisions are restricted to `oberster_richter`; party bans and
high-treason death sentences cannot use that exception. The latter also need a
separate Sicherheitsrat release after the judges have approved. Election deadlines,
recusal and the underlying case must still be checked by the officials.

Profiles include a signature pad for mouse, touch, pen and keyboard. New issues and
countersignatures require a saved drawing; each document keeps its own snapshot.
Historical signatures retain their original appearance.
Local login includes separate OGH test identities for trying the signature flow.
SQLite updates its signature schema on startup. For an **existing Supabase
installation**, run `supabase/migrations/20261023_document_signatures.sql` as the
schema owner, followed by `supabase/migrations/20261023_drawn_signatures.sql`,
before deploying this app version; a new database uses `supabase/init.sql`.
No production database migration is performed by the app.
