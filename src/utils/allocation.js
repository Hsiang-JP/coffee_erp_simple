
export function allocateBags(requirements, availableBags) {
  const { minScore, requiredWeight, variety } = requirements;
  
  // 1. Filter
  let candidates = availableBags.filter(b => 
    b.status === 'Available' && 
    (b.total_score >= minScore) // Assumes bag has score attached, or joined from lot/cupping
  );
  
  if (variety) {
    candidates = candidates.filter(b => b.variety === variety);
  }

  // 2. Determine Quantity
  const BAG_WEIGHT = 69;
  const bagsNeeded = Math.ceil(requiredWeight / BAG_WEIGHT);

  if (candidates.length < bagsNeeded) {
    return []; // Not enough bags
  }

  // 3. Generate Combinations (nCr)
  // Since n is small (10 bags), we can generate all combinations of size 'bagsNeeded'
  const combinations = getCombinations(candidates, bagsNeeded);

  // 4. Score Combinations
  const scoredCombos = combinations.map(combo => {
    const score = calculateScore(combo);
    return { bags: combo, scoreDetails: score };
  });

  // 5. Sort by Total Score Descending
  scoredCombos.sort((a, b) => b.scoreDetails.total - a.scoreDetails.total);

  // Return top 4
  return scoredCombos.slice(0, 4);
}

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  
  const [first, ...rest] = arr;
  
  const combsWithFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const combsWithoutFirst = getCombinations(rest, k);
  
  return [...combsWithFirst, ...combsWithoutFirst];
}

function calculateScore(bags) {
  // Weights
  const W_QUALITY = 0.5;
  const W_MARGIN = 0.3;
  const W_FIFO = 0.2;

  // Metrics Calculation
  
  // 1. Quality (Higher is better)
  const avgQuality = bags.reduce((sum, b) => sum + (b.total_score || 0), 0) / bags.length;
  // Normalize quality (assuming 80-90 range usually)
  const normQuality = normalize(avgQuality, 80, 90); 

  // 2. Margin / Cost (Lower Base Cost is better)
  const avgCost = bags.reduce((sum, b) => sum + (b.base_farm_cost_per_kg || 0), 0) / bags.length;
  // Normalize cost (inverse: lower is better). Assume cost range $5 - $15
  const normCost = 1 - normalize(avgCost, 5, 15);

  // 3. FIFO (Older/Earlier is better)
  // We use harvest_date. Convert to timestamp. Smaller timestamp = older = better.
  const avgDate = bags.reduce((sum, b) => sum + new Date(b.harvest_date).getTime(), 0) / bags.length;
  // Normalize date. Range: 1 year ago to now.
  const now = Date.now();
  const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
  const normFifo = 1 - normalize(avgDate, oneYearAgo, now);

  // 4. Op Cost (Bonus)
  // Stock Code AA-1. Level 1 is hard (bad). Level 10 is easy (good).
  // We prefer Higher Levels.
  let opBonus = 0;
  bags.forEach(b => {
     const parts = b.stock_code?.split('-');
     if (parts && parts[1]) {
        const level = parseInt(parts[1], 10);
        if (level >= 3) opBonus += 0.05; // Small bonus for easy access
     }
  });

  const total = (normQuality * W_QUALITY) + (normCost * W_MARGIN) + (normFifo * W_FIFO) + opBonus;

  return {
    total,
    avgQuality,
    avgCost,
    details: { normQuality, normCost, normFifo, opBonus }
  };
}

function normalize(val, min, max) {
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}
