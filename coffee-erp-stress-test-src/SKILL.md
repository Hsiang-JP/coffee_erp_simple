---
name: coffee-erp-stress-test
description: "High-fidelity stress testing and business logic simulation for Coffee ERP. Use when verifying per-kg cost math, logistics state transitions, or contract pricing integrity across farmers, marketers, and buyers."
---

# Coffee ERP Stress Test

This skill provides a modular, persona-driven simulation engine to verify the integrity of the Coffee ERP system. It implements a "Shadow Math" auditor that detects margin erasure and cost accumulation errors during complex transactions.

## Capabilities

- **Automated Simulation**: Orchestrates realistic business scenarios using Farmer, Marketer, and Buyer personas.
- **Math Auditing**: Empirically verifies per-kg landed costs and contract sale prices to 4 decimal places.
- **Multi-Lot Blends**: Specifically stresses the pricing engine by creating contracts from multiple inventory sources.
- **CI/CD Integration**: Supports a fail-fast mode for automated build pipelines.

## Usage

### Run a Standard Simulation
Run a simulation with 5 contracts (including blends) to check for discrepancies:
```bash
node scripts/run_test.cjs
```

### Parameterized Execution
Specify the number of contracts to generate:
```bash
node scripts/run_test.cjs --contracts=10
```

### CI/CD Mode
Exit with a non-zero code if any math discrepancies are detected:
```bash
node scripts/run_test.cjs --ci
```

## API / Persona Logic

### Farmer Agent (`farmer:intake`)
Registers randomized coffee lots.
- Parameters: `variety`, `total_weight_kg`, `base_farm_cost_per_kg`.

### Marketer Agent (`marketer:sell`)
Allocates bags to clients and calculates contract value.
- Parameters: `client_id`, `is_blend` (boolean), `salePrice`.

### Buyer Agent (`buyer:ship`)
Advances logistics stages and adds accumulation costs.
- Parameters: `contractId`, `stages` (number of steps), `costPerStage`.

## Implementation Details

The skill utilizes a **Shadow Math Auditor** that recalculates business logic in memory, bypassing SQL triggers to identify discrepancies between expected and actual database states.

### Modular Scaffolding
- `scripts/run_test.cjs`: Entry point and environmental mocker.
- `scripts/lib/StressTestEngine.js`: Master orchestrator.
- `scripts/lib/MathAuditor.js`: Verification engine.
- `scripts/lib/personas/`: Industry behavior modules.
