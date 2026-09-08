# Frontend Improvement Plan — AgniDrishti (Proposed changes & roadmap)

Last updated: 2026-09-08  
Author: GitHub Copilot (acting) — changes proposed and initial bug fix committed to main.

Purpose
-------
This document lists the concrete frontend changes planned to make the UI stable, robust, and polished ("max"). It is a prioritized roadmap with files, acceptance criteria, testing steps, and branch/PR guidance for incremental work.

Current status
--------------
- Language composition: primarily Python backend, frontend in JavaScript/TypeScript/CSS.
- I fixed an immediate syntax/runtime parsing error in `frontend/src/App.jsx` (IncidentsTab filter button background). That unblock allows the app to start and the Incidents UI to render.

Goals
-----
- Make the UI load reliably, with no parse/runtime exceptions.
- Improve data resilience: handle missing/invalid API responses gracefully.
- Polish Dashboard & Map UX (sorting, charts, labels, empty states).
- Make UI responsive and accessible (keyboard, contrast, alt text).
- Add tests and CI to prevent regressions.

Priority roadmap (high-level)
-----------------------------
1. Critical fixes (0.5–1 day)
   - Fix parsing/runtime errors (done for one; scan for more).
   - Add general error logging and user-visible error states.

2. Defensive API layer & auth flow (0.5–1 day)
   - Wrap all client calls to validate/normalize responses.
   - Graceful 401 handling without hard reload where appropriate.

3. Dashboard correctness & polish (1–2 days)
   - Fix date handling, sorting, labels, numeric formatting.
   - Add better "no data" messages and CTA to run ML.

4. Map & Incidents UX (1–2 days)
   - Ensure hotspot counts flow from Map -> Topbar.
   - Improve evaluation flow UX and error handling.

5. Styling & responsive polish (1–2 days)
   - Fix minor CSS issues, media queries, and touch targets.
   - Ensure contrast ratios and add aria attributes.

6. Tests & CI (1–2 days)
   - Add eslint/prettier tasks, lightweight unit/smoke tests, and a GitHub Action.

7. Performance & assets (0.5–1 day)
   - Optimize video and bundle assets, lazy-load heavy components.

8. Docs & Developer runbook (0.5 day)
   - Add this README, PR checklist, and deploy notes.

Planned file-by-file changes (concrete)
--------------------------------------

A. Global / Api
- Files:
  - frontend/src/api.js
- Changes:
  - Add response validation wrapper to `apiFetch()` so that:
    - `.json()` calls are guarded in try/catch.
    - Network errors and non-JSON responses are handled.
  - Add a small `handleAuthRedirect` option (configurable) to avoid full-page reloads on 401 by default.
- Acceptance:
  - When backend returns an error (500/404/invalid JSON) the UI shows a friendly message and console shows debug info.

B. App shell / Routing / Topbar
- Files:
  - frontend/src/App.jsx
  - frontend/src/ProfileBadge.jsx
- Changes:
  - Ensure `hotspotCount` is set by `MapView` on load and updated periodically.
  - Guard uses of `user.role` & `user.*` with fallbacks to avoid render crashes.
  - Replace any locale-dependent date parsing used for sorting with ISO dates or epoch timestamps where possible.
- Acceptance:
  - No console exceptions when loading if user is null or token missing.

C. Incidents list / filters
- Files:
  - frontend/src/App.jsx (IncidentsTab)
- Changes:
  - Ensure filter-pill buttons use stable background expressions (fix applied).
  - Ensure `inc.threat_priority` is validated; default to 'LOW'.
  - Add keyboard-accessible focus styles for pills.
- Acceptance:
  - Clicking each filter updates list and updates count, no console errors.

D. Dashboard
- Files:
  - frontend/src/Dashboard.jsx
- Changes:
  - Replace locale-string dates used for chart sorting with stable ISO date keys or timestamps. For daily trend use event date string (acq_date) in ISO or parse to yyyy-mm-dd before grouping.
  - Add guard/formatters for numeric fields (FRP, risk_score) so charts don't crash for NaN/undefined.
  - Improve legend and color fallbacks.
  - Add a small CTA panel when no classification data exists (Run ML).
- Acceptance:
  - Charts render with mock data and empty states show helpful CTAs.

E. Map & Hotspots
- Files:
  - frontend/src/MapView.jsx
- Changes:
  - Defensive checks for API `getHotspots()` and `getFacilities()` results to ensure arrays.
  - Add loading spinner overlays when refreshing.
  - Add small debounce/refresh controls for map updates.
  - Ensure `onHotspotCount` is invoked with numeric 0 when empty.
- Acceptance:
  - Map loads even if backend returns empty lists; topbar shows 0 hotspots.

F. Incidents evaluation & alerts
- Files:
  - frontend/src/MapView.jsx
  - frontend/src/AlertFeed.jsx
- Changes:
  - Improve evaluateIncident error messages (display inline).
  - Avoid silent failures — show toasts or inline statuses.
  - In AlertFeed, ensure `a.sent_at` is validated before formatting.
- Acceptance:
  - User can trigger evaluation; errors show human-friendly text.

G. Landing / Entering (assets & video)
- Files:
  - frontend/src/EnteringPage.jsx
  - frontend/src/LandingHome.tsx
  - frontend/src/LandingHome.css
- Changes:
  - Make background video optional / lazy-loaded for low-speed networks.
  - Provide static image fallback for mobile or low bandwidth.
  - Tune z-index and pointer events so modals/CTAs are accessible.
- Acceptance:
  - Landing page usable on mobile, video fallback works.

H. Styling & Accessibility
- Files:
  - frontend/src/*.css and relevant components
- Changes:
  - Add `aria-*` attributes, ensure focus states, contrast.
  - Make buttons reachable by keyboard and add role/labels where required.
  - Fix a11y issues flagged by axe or Lighthouse.
- Acceptance:
  - Basic Lighthouse accessibility score improved; keyboard navigation works.

I. Testing & CI
- Files:
  - .github/workflows/frontend-smoke.yml (new)
  - package.json (scripts: lint, test, smoke)
- Changes:
  - Add ESLint/Prettier configs (if missing) and a GitHub Action that runs lint and a small smoke test (start app + hit `/api/` mock endpoints).
  - Add a small test harness or a Cypress/Puppeteer smoke to ensure main views render.
- Acceptance:
  - CI runs and blocks PRs with syntax errors.

Estimates
---------
- Critical fixes + API hardening: 1 day
- Dashboard & Map polish: 2 days
- Landing & styling polish: 1–1.5 days
- Tests & CI: 1–2 days
- Buffer & review: 1 day
Total (iterative): ~6–7.5 days (single developer), smaller if we split into multiple PRs.

PR conventions and branching
---------------------------
- Branch naming:
  - fix/..., feat/dashboard-polish, feat/map-hotspot-ux, ci/frontend-smoke
- PR size:
  - Keep PRs small and focused (1–2 concerns per PR).
  - Each PR must include changelog entry, screenshots for visual changes, and acceptance checklist.
- Review checklist:
  - No console errors in browser.
  - Component-level unit/smoke tests pass locally.
  - Responsive checks (desktop/tablet/mobile).
  - Accessibility spot checks (keyboard tab flow, aria roles).

How to test locally (dev instructions)
--------------------------------------
1. Backend:
   - Ensure backend API is running and CORS allows the frontend OR use a small mock server for smoke tests.
2. Frontend:
   - cd frontend
   - npm ci
   - npm run dev (or npm start as per repo)
3. Manual checks:
   - Load page, login if auth working.
   - Open Topbar → verify ML badge, hotspot count.
   - Switch to Dashboard → verify charts render and there are no console errors.
   - Switch to Incidents → test filters, evaluate an incident (mock).
   - Map → check hotspots load and map interactions (if map component present).

Acceptance criteria (project-level)
----------------------------------
- App loads with no unhandled JS parse/runtime exceptions in console.
- Dashboard displays gracefully with mock/empty data.
- Incidents filtering works and is accessible.
- Map page handles empty or bad API responses without crashing.
- CI runs lint & smoke tests on PRs.

Next steps
-----------
This plan is now tracked in the repository. The next phase is to:
1. Scan for additional parse/runtime errors across the frontend codebase.
2. Begin with critical fixes and API layer hardening.
3. Open focused PRs per section (A–I) with test coverage.
4. Incrementally improve dashboard, map, and styling.
5. Add CI/tests to prevent regressions.

See individual PRs for detailed changes, acceptance criteria, and testing steps.
