# Smart Education — Website & Portals

The web platform for **Smart Education Computer Centre**, Kanyapur, Asansol — coaching (Class I–XII, NEET & JEE) and job-ready computer courses. It comprises a **public marketing website** and a **staff console** (SmartEduTrack) for the Super Admin and teachers to run the centre: academic sessions, classes, subjects, teacher–subject authorisations, student registrations, enrolments, attendance, and the full fee / commission / payout flow. Students have no login; their records are kept for them by staff.

This repository holds two implementations, side by side.

## `Old Stack/` — the original static build

Vanilla **HTML5 / CSS3 / ES6+**, no build step. Contains:

- The **public marketing site** (`index.html`, `portal.css/js`) — coaching info, courses, teacher profiles, campus/award photography.
- **Multilingual support** (`translate.js`) — English, Bengali (বাংলা), Hindi (हिन्दी), persisted site-wide.
- A **theme system** (`theme.js`) — light/dark with persistence.
- The **staff console** under `app/` — a `window.SE` namespace of IIFE modules (`app/shared/*.js`) over an Apple-HIG portal design system, with a mock data layer.
- Early portal landing pages kept for reference in `_legacy/` and `future/`, plus `dashboard-react-demo.html`, a single-file React + Framer Motion proof-of-concept of the bento dashboard.

Open `index.html` (or serve the folder) to run it.

## `New Stack/` — the staff console, rebuilt

A ground-up rewrite of the **staff console** (the public marketing site was not ported) in a modern SPA stack.

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** — theme-aware tokens: an Apple-HIG portal palette plus a playful-bento "lime / Clash Display" dashboard identity, light + dark.
- **Framer Motion** — spring physics, `AnimatePresence`, shared-element transitions, optimistic list removals.
- **React Router 7** (role-guarded routes, per-screen code-splitting) and **TanStack Query 5** over a typed mock data layer.

`src/lib/api.ts` is a faithful, typed port of the old console's mock: it resolves ERD-shaped rows from an in-memory DB persisted to `sessionStorage`, so the whole app works end-to-end before a real backend exists. A `request()` HTTP seam is in place for swapping in a live `/api/v1` later.

```bash
cd "New Stack"
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Demo sign-in: any email works; include **"admin"** in the address for the Super Admin console, anything else for a Teacher.

## Status

The New Stack is a complete port of every staff-console screen (1 login + 18 admin + 6 teacher), verified across both roles and both themes, with code-splitting and reduced-motion support. The backend is still the mock; wiring a real API is the remaining step.
