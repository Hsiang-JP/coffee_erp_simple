export const allocateBags = (reqs, inventory) => {
  const { minScore, requiredWeight } = reqs;
  const BAG_WEIGHT = 69.0;
  const bagsNeeded = Math.ceil(requiredWeight / BAG_WEIGHT);

  // 1. Filter: Only Available bags that meet the quality threshold
  const candidates = inventory.filter(b => 
    b.status === 'Available' && b.avgScore >= minScore
  );

  if (candidates.length < bagsNeeded) {
    console.warn("Allocation failed: Not enough matching bags found.");
    return []; 
  }

  // Helper to summarize a selection
  const createOption = (label, sortedBags) => {
    const subset = sortedBags.slice(0, bagsNeeded);
    return {
      strategy: label,
      bags: subset,
      summary: {
        avgCost: subset.reduce((a, b) => a + b.cost_per_kg, 0) / bagsNeeded,
        avgQual: subset.reduce((a, b) => a + b.avgScore, 0) / bagsNeeded,
        // Calculate total weight to confirm fulfillment
        totalWeight: subset.length * BAG_WEIGHT 
      }
    };
  };

  // Define the 4 Strategies
  const options = [
    // 1. BEST QUALITY: Highest SCAA scores first
    createOption("Premium Selection (Quality)", 
      [...candidates].sort((a, b) => b.avgScore - a.avgScore)
    ),

    // 2. LOWEST COST: Maximizing profit margins
    createOption("Economic Selection (Lowest Cost)", 
      [...candidates].sort((a, b) => a.cost_per_kg - b.cost_per_kg)
    ),

    // 3. FIFO: Oldest harvest/inventory first to prevent aging
    createOption("Inventory Health (FIFO)", 
      [...candidates].sort((a, b) => {
        // Sorts by ID or harvest_date string if available
        return a.id.localeCompare(b.id); 
      })
    ),

    // 4. LOWEST OP-COST: Picking bags from top levels (10 down to 1)
    createOption("Operational Efficiency (Fast Pick)", 
      [...candidates].sort((a, b) => {
        const levelA = parseInt(a.stock_code?.split('-')[1]) || 1;
        const levelB = parseInt(b.stock_code?.split('-')[1]) || 1;
        return levelB - levelA; // Higher level (10) comes first
      })
    )
  ];

  return options;
};