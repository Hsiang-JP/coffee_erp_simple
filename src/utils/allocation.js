/**
 * UTILITY: UUID Generator for Contracts & Transactions
 */
export function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const FLAVOR_NOTE_BONUS = 20; // Massive award to prioritize flavor matches

/**
 * SMART ALLOCATION ENGINE (V6 - Strict QC & Fuzzy Awards)
 * Logic: Requires a real cupping score. Un-cupped bags are strictly ignored.
 */
export function allocateBags(reqs, inventory) {
  const { minScore, requiredWeight, variety, flavorNote } = reqs;
  const targetWeight = parseFloat(requiredWeight);
  const searchFlavor = (flavorNote || '').toLowerCase().trim();
  
  // 1. Precise Data Extraction & Fuzzy Scoring
  const cleanInventory = inventory.map(b => {
    // Extract the physical level directly from the string (e.g., "AA-10" -> 10)
    let extractedLevel = 1;
    if (b.stock_code) {
      const parts = b.stock_code.split('-');
      if (parts.length === 2) extractedLevel = parseInt(parts[1], 10) || 1;
    }

    // STRICT QC CHECK: Determine if a real score exists. If null/undefined, keep it null.
    const rawScore = b.quality_score ? parseFloat(b.quality_score) : null;

    // FUZZY FLAVOR AWARD: +20 points for a flavor match
    let flavorBonus = 0;
    if (searchFlavor !== '') {
      const primary = (b.primary_flavor_note || '').toLowerCase();
      const notes = (b.cupping_notes || '').toLowerCase();
      if (primary.includes(searchFlavor) || notes.includes(searchFlavor)) {
        flavorBonus = FLAVOR_NOTE_BONUS; 
      }
    }

    return {
      ...b,
      original_score: rawScore, // Raw score (or null)
      effective_score: rawScore !== null ? rawScore + flavorBonus : null, // Algorithm score
      cost: parseFloat(b.base_farm_cost_per_kg) || 0,
      level: extractedLevel, 
      weight_kg: parseFloat(b.weight_kg) || 69.0
    };
  });

  // 2. Strict Boundary Filters
  let pool = cleanInventory.filter(b => {
    // Rule 1: Must be in the warehouse
    if (b.status !== 'Available') return false;
    
    // Rule 2: STRICT QC ENFORCEMENT - Ignore un-cupped bags completely
    if (b.original_score === null || isNaN(b.original_score)) return false; 
    
    // Rule 3: Must meet the client's minimum quality threshold
    if (b.original_score < minScore) return false; 
    
    // Rule 4: Must match the requested variety (if one is selected)
    if (variety && variety !== '' && b.variety !== variety) return false;
    
    return true; 
  });

  if (pool.length === 0) return [];

  const results = [];

  // 3. The 3 Core Sorting Strategies
  const strategies = [
    {
      name: 'Premium & Profile Match',
      sortFn: (a, b) => {
        // 1st Priority: Effective Score (Quality + Flavor Match)
        if (b.effective_score !== a.effective_score) return b.effective_score - a.effective_score;
        // 2nd Priority: Operational efficiency (Top of the stack first)
        return b.level - a.level; 
      }
    },
    {
      name: 'Lowest Financial Cost',
      sortFn: (a, b) => {
        // 1st Priority: Cheapest base cost
        if (a.cost !== b.cost) return a.cost - b.cost;
        // 2nd Priority: Best quality for that price
        if (b.effective_score !== a.effective_score) return b.effective_score - a.effective_score;
        // 3rd Priority: Top of the stack
        return b.level - a.level;
      }
    },
    {
      name: 'FIFO (Freshness)',
      sortFn: (a, b) => {
        // 1st Priority: Earliest harvest date (First In, First Out)
        const dateA = new Date(a.harvest_date || '2000-01-01').getTime();
        const dateB = new Date(b.harvest_date || '2000-01-01').getTime();
        if (dateA !== dateB) return dateA - dateB;
        
        // 2nd Priority: Best quality
        if (b.effective_score !== a.effective_score) return b.effective_score - a.effective_score;
        
        // 3rd Priority: Top of the stack
        return b.level - a.level;
      }
    }
  ];

  // 4. The Greedy Selector
  strategies.forEach(strat => {
    const rankedPool = [...pool].sort(strat.sortFn);
    let selectedBags = [];
    let currentWeight = 0;

    for (const bag of rankedPool) {
      if (currentWeight >= targetWeight) break;
      selectedBags.push(bag);
      currentWeight += bag.weight_kg;
    }

    // Only save the strategy if we actually hit the required weight
    if (currentWeight >= targetWeight) {
      results.push(formatOption(selectedBags, strat.name));
    }
  });

  // 5. Deduplication: Only show unique fulfillment options
  const uniqueResults = [];
  const seenCombos = new Set();
  for (const res of results) {
    const comboKey = res.bags.map(b => b.id).sort().join(',');
    if (!seenCombos.has(comboKey)) {
      seenCombos.add(comboKey);
      uniqueResults.push(res);
    }
  }

  // Sort final UI cards so the highest Value Score is on top
  return uniqueResults.sort((a, b) => b.summary.score - a.summary.score);
}

// 6. Output Formatter
function formatOption(bags, strategyName) {
  const totalWeight = bags.reduce((sum, b) => sum + b.weight_kg, 0);
  
  // NOTE: We use original_score here so the UI shows the real SCAA score,
  // not the artificially inflated score from the flavor bonus.
  const avgQual = bags.reduce((sum, b) => sum + b.original_score, 0) / bags.length;
  const avgCost = bags.reduce((sum, b) => sum + b.cost, 0) / bags.length;
  const avgLevel = bags.reduce((sum, b) => sum + b.level, 0) / bags.length;

  return {
    strategyName,
    bags,
    summary: {
      totalWeight,
      avgQual,
      avgCost,
      totalPriority: avgLevel / 10,
      score: (avgQual * 50) + (avgLevel * 10) - (avgCost * 2)
    }
  };
}