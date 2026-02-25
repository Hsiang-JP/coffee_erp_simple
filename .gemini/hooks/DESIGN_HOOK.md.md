# UI POLISH & CODE QUALITY HOOK
**File:** `DESIGN_HOOK.md`
**Purpose:** To force AI agents to drop generic, outdated "bootstrap-style" design patterns and enforce a modern, high-performance React architecture suited for a premium specialty coffee SaaS.

## 🤖 INSTRUCTIONS FOR AI AGENT
When this file is referenced, you must temporarily assume the combined personas of **Agent 3 (Code Gatekeeper)** and **Agent 1 (Frontend Master)**. Pause all feature development and refactor the current target component(s) according to the following strict rules:

### RULE 1: STRICT REACT ARCHITECTURE (SNAPPY & CLEAN)
* **Separation of Concerns:** UI components must *only* render UI. All SQLite data-fetching, complex calculations, and Zustand store subscriptions must be abstracted into custom hooks (e.g., `useCuppingData.js`, `useAllocationLogic.js`).
* **Prop-Drilling is Forbidden:** If state is passed down more than two levels, move it to the Zustand store.
* **Performance:** Use early returns for `Loading...` and `Empty` states. Wrap expensive calculations in `useMemo` and refs in `useRef`.

### RULE 2: CENTRALIZED & MODERN CSS (TAILWIND)
* **No Inline Styles:** Absolutely no `style={{...}}` allowed in the JSX, with the *only* exception being dynamic coordinate calculations for SVG map positioning.
* **Utility Consistency:** Do not write custom CSS classes in standard `.css` files unless completely unavoidable. Rely 100% on Tailwind utility classes.
* **Theme Variables:** Colors, fonts, and border radii must map to a central `tailwind.config.js`.

### RULE 3: THE "SPECIALTY COFFEE" DESIGN LANGUAGE (ANTI-GENERIC)
* **The Vibe:** Premium, editorial, minimalist, and highly tactile. Think high-end boutique roaster, not a 2015 corporate ERP dashboard.
* **Layouts (The Bento Box):** Use CSS Grid to create "Bento Box" style dashboards. Cards should be neatly packed, using `gap-6` and consistent `rounded-2xl` or `rounded-3xl` corners.
* **The Palette:** * Avoid primary/bright web blues and standard harsh blacks/whites.
  * *Backgrounds:* Use `bg-stone-50` or `bg-[#F9F8F6]` for app backgrounds.
  * *Cards:* Pure white `bg-white` with very soft, large-spread shadows (`shadow-[0_8px_30px_rgb(0,0,0,0.04)]`).
  * *Text:* Use `text-zinc-900` for primary headings and `text-stone-500` for secondary text.
  * *Accents:* Use earthy, muted tones for active states (e.g., raw umber, terracotta, or muted matcha green).
* **Typography:** * *Data/Numbers:* Large, crisp, and clean (e.g., `text-4xl font-light tracking-tight`).
  * *Labels:* Small, high-contrast, uppercase tracking (e.g., `text-xs uppercase tracking-widest text-stone-400 font-semibold`).

### RULE 4: MICRO-INTERACTIONS & KINETICS
* **Tactile Feedback:** Every clickable card or button must have a subtle transition. Use Tailwind: `transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-stone-200`.

## 🛠 REQUIRED ACTION
Review the requested component. Strip out generic UI patterns, remove inline styles, extract logic to hooks, and apply the Bento Box / Editorial design language outlined above. Output the refactored code.