import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/store';
import { allocateBags } from '../utils/allocation';

const Allocation = () => {
  const { coffees, lots, cuppingReports, fetchAll, refreshTrigger } = useStore();
  
  const [reqs, setReqs] = useState({ minScore: 80, requiredWeight: 138 });
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sync data on mount or when DB changes
  useEffect(() => { fetchAll(); }, [refreshTrigger]);

  // Data Enrichment: Merge Bags + Lots + Scores
  const enrichedInventory = useMemo(() => {
    if (!coffees || !lots) return [];

    return coffees.map(bag => {
      const lot = lots.find(l => l.id === bag.lot_id) || {};
      const reports = (cuppingReports || []).filter(r => r.lot_id === bag.lot_id);
      
      // Calculate average score for the lot
      const avgScore = reports.length > 0 
        ? reports.reduce((sum, r) => sum + (r.total_score || 0), 0) / reports.length 
        : 80; // Default fallback score

      return {
        ...bag,
        variety: lot.variety,
        process_method: lot.process_method,
        avgScore: avgScore,
        cost_per_kg: lot.base_farm_cost_per_kg || 0
      };
    });
  }, [coffees, lots, cuppingReports]);

  const handleRun = () => {
    const options = allocateBags(reqs, enrichedInventory);
    setResults(options);
    if (options.length === 0) alert("No matching inventory found.");
  };

  const palettes = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF'];
  const levels = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // Top down for display

  const getBagState = (p, l) => {
    const code = `${p}-${l}`;
    const bag = enrichedInventory.find(b => b.stock_code === code);
    const isSelected = results[selectedIndex]?.bags.some(b => b.stock_code === code);
    return { bag, isSelected };
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-6 bg-stone-50 min-h-screen">
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-xs uppercase tracking-widest text-stone-400 font-bold mb-4">Criteria</h2>
          <div className="space-y-4">
            <input type="number" value={reqs.requiredWeight} placeholder="Weight kg" className="w-full p-3 bg-stone-50 rounded-lg" onChange={e => setReqs({...reqs, requiredWeight: e.target.value})}/>
            <input type="number" value={reqs.minScore} placeholder="Min Score" className="w-full p-3 bg-stone-50 rounded-lg" onChange={e => setReqs({...reqs, minScore: e.target.value})}/>
            <button onClick={handleRun} className="w-full bg-zinc-900 text-white p-4 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all">Optimize Allocation</button>
          </div>
        </div>

        {results.map((opt, i) => (
          <div key={i} onClick={() => setSelectedIndex(i)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedIndex === i ? 'border-emerald-500 bg-emerald-50' : 'bg-white border-stone-100'}`}>
            <div className="flex justify-between font-bold text-xs uppercase"><span>Option {i+1}</span> <span className="text-emerald-600">{opt.summary.avgQual.toFixed(1)} pts</span></div>
            <div className="text-[10px] text-stone-400 mt-1">Cost: ${opt.summary.avgCost.toFixed(2)}/kg • Efficiency: {(opt.summary.totalPriority * 10).toFixed(0)}%</div>
          </div>
        ))}
      </div>

      {/* Warehouse Visualization */}
      <div className="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
        <h2 className="text-lg font-bold mb-6">Warehouse Cora <span className="text-stone-300 font-light">| Visual Map</span></h2>
        <div className="flex gap-4 justify-center">
          {palettes.map(p => (
            <div key={p} className="flex flex-col gap-1.5">
              {levels.map(l => {
                const { bag, isSelected } = getBagState(p, l);
                return (
                  <div key={l} title={`${p}-${l}`} className={`w-10 h-10 rounded-md border transition-all duration-500 flex items-center justify-center
                    ${isSelected ? 'bg-emerald-500 border-emerald-600 scale-110 shadow-lg z-10' : 
                      bag?.status === 'Available' ? 'bg-zinc-800 border-zinc-900 opacity-100' : 'bg-stone-50 border-stone-100 opacity-20'}
                  `}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                );
              })}
              <div className="text-center text-[10px] font-bold text-stone-400 mt-2">{p}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Allocation;