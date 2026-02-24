import { VwBagDetails, VarietyType } from '../types/database';

export interface AllocationRequirements {
  minScore?: number;
  requiredWeight: number;
  variety?: VarietyType;
  flavorNote?: string;
}

export interface AllocationSummary {
  avgCost: number;
  avgQual: number;
  totalWeight: number;
}

export interface AllocationOption {
  strategy: string;
  bags: VwBagDetails[];
  summary: AllocationSummary;
}

export const allocateBags = (reqs: AllocationRequirements, inventory: VwBagDetails[]): AllocationOption[] => {
  const { minScore, requiredWeight, variety, flavorNote } = reqs;
  const BAG_WEIGHT = 69.0;
  const bagsNeeded = Math.ceil(requiredWeight / BAG_WEIGHT);

  // 1. Filter: Available bags meeting quality/variety threshold
  const candidates = inventory.filter(b => {
    const isAvailable = b.status === 'Available';
    const meetsScore = Number(b.avg_score) >= (minScore || 0);
    const matchesVariety = !variety || b.variety === variety;
    return isAvailable && meetsScore && matchesVariety;
  });

  if (candidates.length < bagsNeeded) {
    console.warn("Allocation failed: Not enough matching bags found.");
    return []; 
  }

  // Utility: Get Warehouse Level (10 = Easiest/Top, 1 = Hardest/Bottom)
  const getOpLevel = (bag: VwBagDetails) => parseInt(bag.stock_code?.split("-")[1] || "1") || 1;

  // Utility: Fuzzy Flavor Match
  const checkFlavorMatch = (bag: VwBagDetails) => {
    if (!flavorNote) return false;
    return bag.aggregate_flavor_profile?.toLowerCase().includes(flavorNote.toLowerCase()) || false;
  };

  // Helper to create a summarized option
  const createOption = (label: string, sortedBags: VwBagDetails[]): AllocationOption => {
    const subset = sortedBags.slice(0, bagsNeeded);
    const count = subset.length;
    return {
      strategy: label,
      bags: subset,
      summary: {
        avgCost: count > 0 ? subset.reduce((sum, b) => sum + Number(b.total_landed_cost_per_kg || 0), 0) / count : 0,
        avgQual: count > 0 ? subset.reduce((sum, b) => sum + Number(b.avg_score || 0), 0) / count : 0,
        totalWeight: subset.reduce((sum, b) => sum + Number(b.weight_kg || 0), 0)
      }
    };
  };

  // Define 3 Primary Strategies with Embedded Operational Efficiency
  const options: AllocationOption[] = [
    // 1. BEST QUALITY: Primary = Score + Flavor, Tie-breaker = Top Level
    createOption("Best Quality", 
      [...candidates].sort((a, b) => {
        const scoreA = Number(a.avg_score || 0) + (checkFlavorMatch(a) ? 10 : 0);
        const scoreB = Number(b.avg_score || 0) + (checkFlavorMatch(b) ? 10 : 0);
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        return getOpLevel(b) - getOpLevel(a); // Tie-breaker: Highest level first
      })
    ),

    // 2. LOWEST COST: Primary = Cost, Tie-breaker = Top Level
    createOption("Lowest Cost", 
      [...candidates].sort((a, b) => {
        const costA = Number(a.total_landed_cost_per_kg || 0);
        const costB = Number(b.total_landed_cost_per_kg || 0);
        
        if (costA !== costB) return costA - costB;
        return getOpLevel(b) - getOpLevel(a); // Tie-breaker: Highest level first
      })
    ),

    // 3. FIFO (FRESHNESS): Primary = Oldest Entry, Tie-breaker = Top Level
    createOption("FIFO (Freshness)", 
      [...candidates].sort((a, b) => {
        const idA = String(a.lot_id || a.id || "");
        const idB = String(b.lot_id || b.id || "");
        
        const cmp = idA.localeCompare(idB, undefined, { numeric: true });
        if (cmp !== 0) return cmp;
        return getOpLevel(b) - getOpLevel(a); // Tie-breaker: Highest level first
      })
    )
  ];

  return options;
};
