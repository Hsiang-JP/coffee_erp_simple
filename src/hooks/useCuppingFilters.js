import { useState, useEffect } from 'react';
import { execute } from '../db/dbSetup';

export function useCuppingFilters() {
  const [filters, setFilters] = useState({
    farmName: '',
    cupperName: '',
    lotPublicId: ''
  });
  const [results, setResults] = useState([]);
  const [options, setOptions] = useState({
    farms: [],
    cuppers: [],
    lots: []
  });

  // Load initial options
  useEffect(() => {
    async function loadOptions() {
      const farms = await execute("SELECT DISTINCT name FROM farms ORDER BY name");
      const cuppers = await execute("SELECT DISTINCT cupper_name FROM cupping_sessions ORDER BY cupper_name");
      const lots = await execute("SELECT DISTINCT public_id FROM lots ORDER BY public_id");
      
      setOptions({
        farms: farms.map(f => f.name),
        cuppers: cuppers.map(c => c.cupper_name),
        lots: lots.map(l => l.public_id)
      });
    }
    loadOptions();
  }, []);

  // Filter Logic
  useEffect(() => {
    async function filterData() {
      let query = `
        SELECT cs.*, l.public_id as lot_code, f.name as farm_name, l.variety, l.process_method
        FROM cupping_sessions cs
        JOIN lots l ON cs.lot_id = l.id
        JOIN farms f ON l.farm_id = f.id
        WHERE 1=1
      `;
      
      const bindings = [];

      if (filters.farmName) {
        query += ` AND f.name LIKE '${filters.farmName}'`; 
      }
      if (filters.cupperName) {
        query += ` AND cs.cupper_name LIKE '${filters.cupperName}'`;
      }
      if (filters.lotPublicId) {
        query += ` AND l.public_id LIKE '${filters.lotPublicId}'`;
      }

      // "One random cupping session per lot" - implies Group By Lot if we want distinct lots, 
      // but usually QC reports show all sessions.
      // However, the prompt says "We need one random cupping session per lot"
      // So let's Group By Lot ID.
      query += ` GROUP BY l.id`;

      const data = await execute(query);
      setResults(data);
    }

    filterData();
  }, [filters]);

  return { filters, setFilters, results, options };
}
