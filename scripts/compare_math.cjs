#!/usr/bin/env node

/**
 * Math Comparison Script
 * Runs the validation logic and compares the results against a baseline file.
 * Used to verify that refactors haven't changed financial calculations.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const projectRoot = process.cwd();
const BASELINE_FILE = path.join(projectRoot, 'math_validation_results.json');
const TEMP_FILE = path.join(projectRoot, 'math_temp_results.json');
const VALIDATE_SCRIPT = path.join(projectRoot, 'scripts/validate_math.cjs');

async function run() {
  if (!fs.existsSync(BASELINE_FILE)) {
    console.error(`❌ Error: Baseline file not found at ${BASELINE_FILE}`);
    console.log(`Run 'node scripts/validate_math.cjs' first to generate a baseline.`);
    process.exit(1);
  }

  console.log(`🔍 Starting Math Comparison...`);
  
  // 1. Generate current results into a temporary file
  // We'll modify validate_math.cjs temporarily to output to a different file
  const originalScript = fs.readFileSync(VALIDATE_SCRIPT, 'utf8');
  const tempScriptContent = originalScript.replace(
    /const OUTPUT_FILE = .*;/,
    `const OUTPUT_FILE = '${TEMP_FILE}';`
  );
  
  const tempScriptPath = path.join(projectRoot, 'scripts/temp_validate.cjs');
  fs.writeFileSync(tempScriptPath, tempScriptContent);
  
  try {
    execSync(`node "${tempScriptPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Error running validation script.`);
    process.exit(1);
  } finally {
    if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
  }

  // 2. Load both results
  const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  const current = JSON.parse(fs.readFileSync(TEMP_FILE, 'utf8'));

  // 3. Compare
  let mismatchCount = 0;
  let totalChecks = 0;

  for (const seed in baseline) {
    const baselineBags = baseline[seed];
    const currentBags = current[seed];

    if (!currentBags) {
      console.error(`❌ Error: Seed ${seed} missing in current results.`);
      mismatchCount++;
      continue;
    }

    baselineBags.forEach((bBag, index) => {
      totalChecks++;
      const cBag = currentBags[index];

      if (!cBag) {
        console.error(`❌ Error: Bag index ${index} missing for seed ${seed}.`);
        mismatchCount++;
        return;
      }

      // Check manual landed cost
      if (Math.abs(bBag.manual_landed_cost - cBag.manual_landed_cost) > 0.0001) {
        console.error(`❌ Mismatch in Seed ${seed}, Bag ${bBag.bag_id}:`);
        console.log(`   Manual Calc: Baseline=${bBag.manual_landed_cost}, Current=${cBag.manual_landed_cost}`);
        mismatchCount++;
      }

      // Check DB calculated price
      if (Math.abs(bBag.db_landed_cost - cBag.db_landed_cost) > 0.0001) {
        console.error(`❌ Mismatch in Seed ${seed}, Bag ${bBag.bag_id}:`);
        console.log(`   DB Calculation: Baseline=${bBag.db_landed_cost}, Current=${cBag.db_landed_cost}`);
        mismatchCount++;
      }
    });
  }

  // 4. Report
  if (fs.existsSync(TEMP_FILE)) fs.unlinkSync(TEMP_FILE);

  console.log(`
--- Comparison Summary ---`);
  console.log(`Total Checks: ${totalChecks}`);
  
  if (mismatchCount === 0) {
    console.log(`✅ SUCCESS: All math checks passed! Architecture is validated.`);
  } else {
    console.error(`❌ FAILURE: Found ${mismatchCount} discrepancies.`);
    process.exit(1);
  }
}

run().catch(console.error);
