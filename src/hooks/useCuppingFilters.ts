import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/store';
import { VwCuppingDetails } from '../types/database';

export interface CuppingFilters {
  farmName: string;
  cupperName: string;
  lotPublicId: string;
}

export interface CuppingFilterOptions {
  farms: string[];
  cuppers: string[];
  lots: string[];
}

export function useCuppingFilters() {
  const { cuppingReports, farms, lots } = useStore();
  const [filters, setFilters] = useState<CuppingFilters>({
    farmName: '',
    cupperName: '',
    lotPublicId: ''
  });

  // Diagnostic Focus: Verify store consumption
  useEffect(() => {
    console.log("🔍 [QC Debug] Farms in Store:", farms);
    console.log("🔍 [QC Debug] Lots in Store:", lots);
    console.log("🔍 [QC Debug] Cupping Reports in Store:", cuppingReports);
  }, [farms, lots, cuppingReports]);

  // Derived Options from Store Data - Consuming global entity lists
  const options = useMemo<CuppingFilterOptions>(() => {
    const farmOptions = [...new Set(farms.map(f => f.name))].sort();
    const cupperOptions = [...new Set(cuppingReports.map(r => r.cupper_name))].sort();
    
    // Filter lots by farm if farm is selected
    let availableLots = lots;
    if (filters.farmName) {
        const farm = farms.find(f => f.name === filters.farmName);
        if (farm) {
            availableLots = lots.filter(l => l.farm_id === farm.id);
        }
    }
    const lotOptions = [...new Set(availableLots.map(l => l.public_id).filter((id): id is string => id !== null))].sort();
    
    return { 
      farms: farmOptions, 
      cuppers: cupperOptions, 
      lots: lotOptions 
    };
  }, [farms, cuppingReports, lots, filters.farmName]);

  // Derived Results from Store Data (One unique cupping session per lot)
  const results = useMemo<VwCuppingDetails[]>(() => {
    // Agent 3: Sort by latest first before deduplication
    let filtered = [...cuppingReports].sort((a, b) => b.id.localeCompare(a.id));

    if (filters.farmName) {
      filtered = filtered.filter(r => r.farm_name === filters.farmName);
    }
    if (filters.cupperName) {
      filtered = filtered.filter(r => r.cupper_name === filters.cupperName);
    }
    if (filters.lotPublicId) {
      filtered = filtered.filter(r => r.lot_public_id === filters.lotPublicId);
    }

    return filtered;
  }, [cuppingReports, filters]);

  return { filters, setFilters, results, options };
}
