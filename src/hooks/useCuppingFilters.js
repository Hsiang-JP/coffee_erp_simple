import { useState, useEffect, useMemo } from 'react';
import { execute } from '../db/dbSetup';

export const useCuppingFilters = () => {
  const [filters, setFilters] = useState({
    farmName: '',
    cupperName: '',
    lotPublicId: ''
  });
  const [rawData, setRawData] = useState([]);
  const [options, setOptions] = useState({ farms: [], cuppers: [], lots: [] });

  // 1. Fetch Filter Options on Mount
  useEffect(() => {
    const loadOptions = async () => {
      const farms = await execute("SELECT DISTINCT name FROM farms ORDER BY name ASC");
      const cuppers = await execute("SELECT DISTINCT cupper_name FROM cupping_sessions ORDER BY cupper_name ASC");
      const lots = await execute("SELECT DISTINCT public_id FROM lots ORDER BY public_id ASC");
      
      setOptions({
        farms: farms.map(f => f.name),
        cuppers: cuppers.map(c => c.cupper_name),
        lots: lots.map(l => l.public_id)
      });
    };
    loadOptions();
  }, []);

  // 2. Main Data Fetching with SQL Logic (Agent 2 Directive)
  useEffect(() => {
    const fetchData = async () => {
      // Use the View to get Lot, Farm, and Session data in one JOINed result
      let query = `
        SELECT 
          cs.*, 
          l.public_id as lot_code, 
          f.name as farm_name,
          l.variety,
          l.process_method
        FROM cupping_sessions cs
        JOIN lots l ON cs.lot_id = l.id
        JOIN farms f ON l.farm_id = f.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.farmName) {
        query += ` AND f.name = ?`;
        params.push(filters.farmName);
      }
      if (filters.cupperName) {
        query += ` AND cs.cupper_name = ?`;
        params.push(filters.cupperName);
      }
      if (filters.lotPublicId) {
        query += ` AND l.public_id = ?`;
        params.push(filters.lotPublicId);
      }

      query += ` ORDER BY cs.cupping_date DESC`;

      const data = await execute(query, params);
      setRawData(data);
    };

    fetchData();
  }, [filters]);

  // 3. Data Sanitization (Agent 3 Directive)
  const results = useMemo(() => {
    return rawData.map(report => ({
      ...report,
      // Ensure all scores are numbers for the UI Progress Bars
      score_fragrance: parseFloat(report.score_fragrance) || 0,
      score_flavor: parseFloat(report.score_flavor) || 0,
      score_aftertaste: parseFloat(report.score_aftertaste) || 0,
      score_acidity: parseFloat(report.score_acidity) || 0,
      score_body: parseFloat(report.score_body) || 0,
      score_balance: parseFloat(report.score_balance) || 0,
      score_uniformity: parseFloat(report.score_uniformity) || 0,
      score_clean_cup: parseFloat(report.score_clean_cup) || 0,
      score_sweetness: parseFloat(report.score_sweetness) || 0,
      score_overall: parseFloat(report.score_overall) || 0,
      total_score: parseFloat(report.total_score) || 0
    }));
  }, [rawData]);

  return { filters, setFilters, results, options };
};