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
bun run build
```

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, React Three Fiber + drei, Motion, react-markdown.
Deployed on Vercel.
