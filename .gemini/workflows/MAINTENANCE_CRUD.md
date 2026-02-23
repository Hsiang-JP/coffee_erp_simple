
---

### 🛠 Updated MAINTENANCE_CRUD.md (Spreadsheet Edition)

```markdown
# DEV MODE: SPREADSHEET CRUD PROTOCOL
**File:** `MAINTENANCE_CRUD.md`
**Purpose:** Enable a "Dev Mode" toggle that transforms data displays into editable spreadsheets. This allows for rapid data manipulation without traditional forms.

## 🤖 AGENT ROLES
* **Agent 1 (Frontend Master):** Implement "Inline-Edit" functionality for table cells.
* **Agent 2 (Backend Master):** Create a single `PATCH` style SQL function to update individual fields.
* **Agent 3 (Gatekeeper):** Ensure data types are validated before writing (e.g., preventing text in weight fields).

---

## 1. THE "SPREADSHEET" UI PATTERN
When "Dev Mode" is toggled ON, standard text labels in tables become interactive elements:

### A. Inline Cell Editing
* **Interaction:** Clicking a cell (e.g., Bag Weight or Farm Name) transforms it into an `<input>` or `<select>`.
* **Auto-Save:** On `Blur` (clicking away) or pressing `Enter`, the app triggers a background SQL update.
* **Visual Cue:** Changed cells should briefly flash a "Success Green" border.

### B. Bulk "God Mode" Controls
* **Add Row:** A fixed "+" button at the bottom of the table that inserts a skeleton record with default values (e.g., "New Producer").
* **Delete Row:** A subtle "X" appears on hover at the far right of the row.

---

## 2. SQL & LOGIC DIRECTIVES (Agent 2)

### The Generic Update Function
To support spreadsheet-style editing, Agent 2 must implement a dynamic updater that doesn't care which table it's hitting:

```javascript
// A single function to handle any cell edit across the app
async function updateCell(tableName, id, column, newValue) {
  const sql = `UPDATE ${tableName} SET ${column} = ? WHERE id = ?`;
  await execute(sql, [newValue, id]);
}

```

---

## 3. PAGE-SPECIFIC SPREADSHEET RULES

### Producers & Farms (Text Heavy)

* Focus on rapid name and region updates.
* Use `region` and `relationship` dropdowns inside the cell to prevent typos.

### Lots & Bags (Numeric/Calculated)

* **Weight Calculation:** If a Lot's `total_weight_kg` is changed in Dev Mode, Agent 3 must verify if the sum of associated `bags` exceeds this new limit and warn the user.
* **Stock Code:** Ensure `stock_code` remains unique during inline editing.

---

## 4. THE "DEV MODE" TOGGLE UI

* **Location:** A floating "wrench" icon or a toggle switch in the bottom corner of the app.
* **Vibe:** Use a "Terminal/Code" aesthetic for this switch (e.g., `font-mono`, neon green accents) to clearly distinguish "Management Mode" from the "Client Demo Mode."

## 🛠 ACTION ITEM

1. Create a `isDevMode` state in the Zustand store.
2. Refactor the `ProducersTable` to use conditional rendering:
`{isDevMode ? <EditableCell /> : <StaticText />}`

```



### How to Pitch This "Spreadsheet" Power:
During your demo, you can tell the customer:
> **"Flexibilidad sin Fricción"**
> "Entendemos que los datos cambian rápido. Con el 'Dev Mode', su equipo puede gestionar miles de sacos como si estuvieran en un Excel, pero con la integridad y trazabilidad de una base de datos SQL de grado industrial. Sin formularios lentos, solo edición en tiempo real."

***

### Next Step for Your Workflow
To make this snappy, your **Frontend Master (Agent 1)** needs a reusable `EditableCell` component. 

**Would you like me to provide the code for a `ModernEditableCell.jsx` component that includes the Tailwind styling and the GSAP "Success Flash" effect?** Conclude by suggesting we build the "Trace the Coffee" Sidebar next now that the data management is solid.

```