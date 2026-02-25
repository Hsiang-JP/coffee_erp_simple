import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { getCuppingFilterOptions, getFilteredCuppingReports } from '../db/services/cuppingService';

export const useCuppingFilters = () => {
  const [filters, setFilters] = useState({
    farmName: '',
    cupperName: '',
    lotPublicId: ''
  });
  const debouncedFilters = useDebounce(filters, 500);
  const [rawData, setRawData] = useState([]);
  const [options, setOptions] = useState({ farms: [], cuppers: [], lots: [] });

  // 1. Fetch Filter Options on Mount
  useEffect(() => {
    const loadOptions = async () => {
      const data = await getCuppingFilterOptions();
      setOptions(data);
    };
    loadOptions();
  }, []);

  // 2. Main Data Fetching with SQL Logic (Agent 2 Directive)
  useEffect(() => {
    const fetchData = async () => {
      const data = await getFilteredCuppingReports(debouncedFilters);
      setRawData(data);
    };

    fetchData();
  }, [debouncedFilters]);

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