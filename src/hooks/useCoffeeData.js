import { useEffect } from 'react';
import { useStore } from '../store/store';
import { initDB, execute } from '../db/dbSetup';

export function useCoffeeData() {
  const setCoffees = useStore((state) => state.setCoffees);
  const setContracts = useStore((state) => state.setContracts);
  const setCuppingReports = useStore((state) => state.setCuppingReports);
  const setMilestones = useStore((state) => state.setMilestones);
  const refreshTrigger = useStore((state) => state.refreshTrigger);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        await initDB();
        
        // Fetch Bags with details
        const bags = await execute(`
          SELECT b.*, l.variety, l.process_method, f.name as farm_name, bm.current_stage 
          FROM bags b
          JOIN lots l ON b.lot_id = l.id
          JOIN farms f ON l.farm_id = f.id
          LEFT JOIN bag_milestones bm ON b.id = bm.bag_id
        `);
        
        if (isMounted) setCoffees(bags);

        // Fetch Contracts
        const contracts = await execute(`
          SELECT c.*, cl.name as client_name 
          FROM contracts c
          JOIN clients cl ON c.client_id = cl.id
        `);

        if (isMounted) setContracts(contracts);

        // Fetch Cupping Reports
        const reports = await execute(`
          SELECT cs.*, l.public_id as lot_code, f.name as farm_name, l.variety, l.process_method,
                 cs.score_acidity, cs.score_body, cs.score_balance, cs.notes
          FROM cupping_sessions cs
          JOIN lots l ON cs.lot_id = l.id
          JOIN farms f ON l.farm_id = f.id
        `);
        
        if (isMounted) setCuppingReports(reports);
        
        // Fetch Milestones
        const milestones = await execute(`SELECT * FROM bag_milestones`);
        
        if (isMounted) setMilestones(milestones);

      } catch (error) {
        console.error("Data fetch failed:", error);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [setCoffees, setContracts, setCuppingReports, setMilestones, refreshTrigger]);
}
