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

const FLAVOR_NOTE_BONUS = 20;

/**
 * SMART ALLOCATION ENGINE
 * Updated to consume the 'available_inventory_optimization' SQL View
 */
export function allocateBags(reqs, inventory) {
  const { minScore, requiredWeight, variety, flavorNote } = reqs;
  const targetWeight = parseFloat(requiredWeight) || 0;
  const searchFlavor = (flavorNote || '').toLowerCase().trim();
  
  // 1. Precise Data Extraction 
  const cleanInventory = inventory.map(b => {
    // The SQL View provides storage_level natively. Fallback to string split just in case.
    let level = b.storage_level ? parseInt(b.storage_level, 10) : 1;
    if (!b.storage_level && b.stock_code) {
      const parts = b.stock_code.split('-');
      if (parts.length === 2) level = parseInt(parts[1], 10) || 1;
    }

    // STRICT QC CHECK: Read directly from the View's 'quality_score'
    const rawScore = b.quality_score ? parseFloat(b.quality_score) : null;

    // FUZZY FLAVOR AWARD: Read directly from the View's 'primary_flavor_note'
    let flavorBonus = 0;
    if (searchFlavor !== '') {
      const primary = (b.primary_flavor_note || '').toLowerCase();
      if (primary.includes(searchFlavor)) {
        flavorBonus = FLAVOR_NOTE_BONUS; 
      }
    }

    return {
      ...b,
      original_score: rawScore, 
      effective_score: rawScore !== null ? rawScore + flavorBonus : null,
      // Use the true landed cost calculated by the SQLite View!
      cost: parseFloat(b.current_per_kg_cost) || parseFloat(b.base_farm_cost_per_kg) || 0,
      level: level, 
      weight_kg: parseFloat(b.weight_kg) || 69.0
    };
  });

  // 2. Strict Boundary Filters
  let pool = cleanInventory.filter(b => {
    if (b.status !== 'Available') return false;
    // Ignore un-cupped bags completely
    if (b.original_score === null || isNaN(b.original_score)) return false; 
    // Must meet the client's minimum quality threshold
    if (b.original_score < minScore) return false; 
    // Must match the requested variety (if one is selected)
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
        if (b.effective_score !== a.effective_score) return b.effective_score - a.effective_score;
        return b.level - a.level; 
      }
    },
    {
      name: 'Lowest Financial Cost',
      sortFn: (a, b) => {
        if (a.cost !== b.cost) return a.cost - b.cost;
        if (b.effective_score !== a.effective_score) return b.effective_score - a.effective_score;
        return b.level - a.level;
      }
    },
    {
      name: 'FIFO (Freshness)',
      sortFn: (a, b) => {
        const dateA = new Date(a.harvest_date || '2000-01-01').getTime();
        const dateB = new Date(b.harvest_date || '2000-01-01').getTime();
        if (dateA !== dateB) return dateA - dateB;
        if (b.effective_score !== a.effective_score) return b.effective_score - a.effective_score;
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

    if (currentWeight >= targetWeight) {
      results.push(formatOption(selectedBags, strat.name));
    }
  });

  // 5. Deduplication
  const uniqueResults = [];
  const seenCombos = new Set();
  for (const res of results) {
    const comboKey = res.bags.map(b => b.id).sort().join(',');
    if (!seenCombos.has(comboKey)) {
      seenCombos.add(comboKey);
      uniqueResults.push(res);
    }
  }

  return uniqueResults.sort((a, b) => b.summary.score - a.summary.score);
}

// 6. Output Formatter
function formatOption(bags, strategyName) {
  const totalWeight = bags.reduce((sum, b) => sum + b.weight_kg, 0);
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