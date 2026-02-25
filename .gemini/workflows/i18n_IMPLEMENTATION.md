# 🌍 i18n Multilingual Implementation Workflow: English & Peruvian Spanish

## 🎯 Primary Objective
Implement `react-i18next` across the React application to support English (en) and Peruvian Spanish (es-PE). 

## 🛑 Strict Directives & Guardrails
1. **Currency Lock:** All currency must remain in USD (`$`). Do NOT convert values or symbols to Peruvian Soles (`S/`).
2. **Peruvian Localization:** You MUST perform web searches to verify coffee industry terminology specific to Peru (e.g., using "Finca" or "Chacra" instead of "Granja", "Acopio" for collection, "Pergamino" for parchment).
3. **Zero Logic Loss:** You are modifying the presentation layer ONLY. State management (Zustand), database calls (SQLite), UI styling (Tailwind CSS), must remain 100% intact.

---

## 🏗️ Phase 1: Stack Initialization
**Agent Role:** Lead Developer
1. Install dependencies: `npm install i18next react-i18next i18next-browser-languagedetector`
2. Create `src/i18n.js` with standard configuration.
3. Create the translation JSON dictionaries:
   * `src/locales/en/translation.json`
   * `src/locales/es-PE/translation.json`
4. Import `src/i18n.js` into `src/main.jsx` (or `index.js`).

---

## 🔍 Phase 2: Terminology Research & Dictionary Building
**Agent Role:** Localization Expert
1. Scan the target React component to identify all hardcoded user-facing strings.
2. **[WEB SEARCH REQUIRED]** Cross-reference coffee supply chain terms with Peruvian usage. 
   * *Example Query:* "Terminología de producción de café en Perú"
3. Populate the `en` and `es-PE` JSON dictionaries with the extracted strings as key-value pairs. Use nested objects for organization (e.g., `cupping.fragrance`, `journey.warehouse`).

---

## 🛡️ Phase 3: The Safe Modification Protocol (Strict Execution Required)
**Agent Role:** Front-End Developer & QA Reviewer
*You must execute this protocol for EVERY individual file you modify.*

### Step 1: Backup
* Before making any edits, create a direct copy of the target file.
* *Example:* `cp src/pages/CoffeeJourney.jsx src/pages/CoffeeJourney.backup.jsx`

### Step 2: Implementation
* Import the translation hook: `import { useTranslation } from 'react-i18next';`
* Initialize the hook inside the component: `const { t } = useTranslation();`
* Replace hardcoded strings with the translation function: `t('your.key')`.
* Keep all Tailwind classes, inline styles, and dynamic variables (e.g., `${metrics.total_weight}`) exactly as they are.

### Step 3: Cross-Validation & Diff Check (Quality Assurance)
* **[ACTION REQUIRED]** Compare the modified file against the backup file. 
* Perform a structural check:
  1. Did any `useState`, `useEffect`, or `useMemo` hooks disappear or change?
  2. Did any `className` strings get accidentally shortened or deleted?
  3. Are all database service imports and functions still present?
* If the logic or styling does not match the backup 1:1 (excluding the injected `t()` functions), **REVERT** to the backup and restart Step 2.

### Step 4: Cleanup
* Once validation passes, delete the `.backup.jsx` file. Move to the next component.

---

## 🧪 Phase 4: Final System Review
**Agent Role:** Lead QA
1. Implement a simple Language Toggle component (EN / ES) in the main navigation.
2. Verify that switching languages updates the UI dynamically without requiring a page reload.
3. Verify that all numerical data (Weight, USD Costs, Cupping Scores) remains accurately formatted and is not broken by the language switch.