import { useEffect } from 'react';
import { useStore } from '../store/store';
import { advanceContractStage } from '../db/services/contractService';
import { buyLotTransaction } from '../db/services/lotService';

export function useCoffeeData() {
  const fetchAll = useStore((state) => state.fetchAll);
  const refreshTrigger = useStore((state) => state.refreshTrigger);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshTrigger]);
}

export function useAdvanceStage() {
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  
  return async (contractId, costValue) => {
    // 1. Write to wa-sqlite
    const res = await advanceContractStage(contractId, costValue);
    
    // 2. Trigger the Zustand refresh loop
    triggerRefresh();
    
    // 3. Optional but recommended: Add a tiny artificial delay so the UI 
    // doesn't instantly snap out of "Processing..." before the DB read finishes.
    await new Promise(resolve => setTimeout(resolve, 300)); 
    
    return res;
  };
}

/**
 * Hook to execute a lot purchase and immediately refresh the global store.
 */
export function useBuyLot() {
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  const fetchAll = useStore((state) => state.fetchAll); 

  return async (lotData) => {
    try {
      // 1. Execute the database transaction
      const result = await buyLotTransaction(lotData);
      
      // 2. Wait for the database to finish updating the views
      await fetchAll(); 
      
      // 3. Notify the UI to re-render
      triggerRefresh();
      
      return result;
    } catch (error) {
      console.error("Failed to buy lot:", error);
      throw error; // Re-throw so the UI can catch it and show an alert
    }
  };
}