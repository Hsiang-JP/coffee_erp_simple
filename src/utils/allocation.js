export function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * SMART ALLOCATION ENGINE (Pro Level)
 * Logic: Greedy Selection with Multi-Variable Scoring
 */

const DEFAULT_BAG_WEIGHT_KG = 69.0;
const FLAVOR_NOTE_BONUS_SCORE = 5;

function compareDates(dateA, dateB) {
  const d1 = new Date(dateA);
  const d2 = new Date(dateB);
  return d1.getTime() - d2.getTime();
}

export function allocateBags(reqs, inventory) {
  const { minScore, requiredWeight } = reqs;
  const targetWeight = parseFloat(requiredWeight);
  
  // 1. Filter and Initial Sort (Quality First)
  let pool = inventory.filter(b => {
    // Always apply status and minScore filter
    if (b.status !== 'Available' || b.quality_score < minScore) {
      return false;
    }

    // Variety filter
    if (reqs.variety && reqs.variety !== '' && b.variety !== reqs.variety) {
      return false;
    }

    // Flavor Note filter (case-insensitive fuzzy search)
    if (reqs.flavorNote && reqs.flavorNote !== '') {
      const bagFlavorNotes = b.primary_flavor_note ? b.primary_flavor_note.toLowerCase() : '';
      const searchFlavorNote = reqs.flavorNote.toLowerCase();
      if (!bagFlavorNotes.includes(searchFlavorNote)) {
        return false;
      }
    }

    return true;
  });

  if (pool.length === 0) return [];

  const results = [];

  const searchFlavorNote = reqs.flavorNote ? reqs.flavorNote.toLowerCase() : '';

  // We generate 3 distinct strategy variations for the user to choose from
  const strategies = [
    {
      name: 'Best Quality',
      sortFn: (a, b) => {
        let scoreA = a.quality_score;
        let scoreB = b.quality_score;

        // Apply Flavor Note Reward
        if (searchFlavorNote && a.primary_flavor_note && a.primary_flavor_note.toLowerCase().includes(searchFlavorNote)) {
          scoreA += FLAVOR_NOTE_BONUS_SCORE; // Example bonus
        }
        if (searchFlavorNote && b.primary_flavor_note && b.primary_flavor_note.toLowerCase().includes(searchFlavorNote)) {
          scoreB += FLAVOR_NOTE_BONUS_SCORE; // Example bonus
        }

        // Prioritize quality_score DESC (with bonus)
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // Tie-break with storage_level ASC
        return a.storage_level - b.storage_level;
      }
    },
    {
      name: 'Lowest Cost',
      sortFn: (a, b) => {
        // Prioritize base_farm_cost_per_kg ASC
        if (a.base_farm_cost_per_kg !== b.base_farm_cost_per_kg) {
          return a.base_farm_cost_per_kg - b.base_farm_cost_per_kg;
        }
        // Tie-break with storage_level ASC
        return a.storage_level - b.storage_level;
      }
    },
    {
      name: 'FIFO (Freshness)',
      sortFn: (a, b) => {
        // Prioritize harvest_date ASC (earliest first)
        const dateComparison = compareDates(a.harvest_date, b.harvest_date);
        if (dateComparison !== 0) {
          return dateComparison;
        }
        // Tie-break with storage_level ASC
        return a.storage_level - b.storage_level;
      }
    }
  ];

  strategies.forEach(strat => {
    // Rank pool based on strategy's sort function
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

  return results.sort((a, b) => b.summary.score - a.summary.score);
}

function formatOption(bags, strategyName) {
  const totalWeight = bags.reduce((sum, b) => sum + b.weight_kg, 0);
  const avgQual = bags.reduce((sum, b) => sum + b.quality_score, 0) / bags.length;
  const avgCost = bags.reduce((sum, b) => sum + b.base_farm_cost_per_kg, 0) / bags.length;
  const avgLevel = bags.reduce((sum, b) => sum + b.storage_level, 0) / bags.length;

  return {
    strategyName,
    bags,
    summary: {
      totalWeight,
      avgQual,
      avgCost,
      // Efficiency is normalized: Level 10 = 1.0, Level 1 = 0.1
      totalPriority: avgLevel / 10, 
      score: (avgQual * 10) + (avgLevel * 5) - (avgCost * 2)
    }
  };
}