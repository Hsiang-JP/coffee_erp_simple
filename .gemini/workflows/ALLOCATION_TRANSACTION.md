
---

# WORKFLOW: ALLOCATION TO CONTRACT TRANSACTION

**File:** `ALLOCATION_TRANSACTION.md`

**Purpose:** Enable filtering by variety/flavor and implement the "Finalize Reservation" logic that converts suggestions into active contracts.


---

## 1. ADVANCED FILTERING LOGIC

Update the `allocateBags` utility to handle specific specialty coffee attributes:

* **Variety Filter:** If selected, only include bags matching the variety (e.g., 'Geisha', 'Caturra'). 
* **Flavor Note Filter (Fuzzy Search):** Use a case-insensitive check to see if the `primary_flavor_note` from the `cupping_session` table contains the user's input (e.g., 'Jasmine'). Act as a reward for the optimizer, for example, for the maximum quality, we want the options than contains the notes. 
* **Available Stock Only:** Strictly filter `bags.status = 'Available'`.

---

## 2. THE THREE-STRATEGY RE-SORTING

The agent must implement the four specific business goals requested:

1. **Best Quality:** Sort by `avgScore` DESC.
2. **Lowest Cost:** Sort by `cost_per_kg` ASC.
3. **FIFO (Freshness):** Sort by `lot_id` or `id` ASC (oldest first).

The operational cost is used to decide the final options in each categories. For example, in the best quality category, there are 3 options all have the same `score`, then the option with the minimum operational cost will be seleceted (normally the bags on the top level)

Implement the reward for the flavor notes.

---

## 3. THE "FINALIZE RESERVATION" TRANSACTION (Agent 2)

When the user selects a combination and clicks **"Create Contract,"** the system will register a new contract with the status "Processing"



---

## 4. UI REQUIREMENTS (Agent 1)

* **Strategy Labels:** The sidebar must clearly label each option as "Best Quality," "Lowest Cost," etc.
* **Confirmation Modal:** Before finalizing, show a summary: "You are about to allocate X bags of [Variety] to a new contract for [Client]." Show the details of what bag (public_id) and what quantity at what location. 
* **Success Feedback:** Use a GSAP animation to "lock" the bags in the warehouse map, for the bags that are selected, change the boarder to 3 times thick. White -> Empty, BLue -> Stock, Blue with thick boarder -> Allocated.
* **Inventory details:** When the mouse hover over the square, if the square is stocked, show the Farm, Variety, Weight of the bag and the score.

---

## 5. DATABASE INTEGRITY RULES (Agent 3)

* **Conflict Prevention:** Verify that no selected bag has been allocated by another user since the search was initiated.
* **Calculated Final Price:** When creating the contract, automatically calculate the `contract_value` by summing the `cost_per_kg`  and all the lot transaction (now pass to bag) from the cost_ledger table of the selected bags.

---

### 🛠 ACTION ITEM

Implement the **Variety** and **Flavor Note** inputs in the `Allocation.jsx` sidebar first. Once the filtering is perfect, proceed to build the `finalizeContract` function in `dbSetup.js`.

