import React, { useState } from 'react';
import { useStore } from '../store';
import { allocateBags } from '../utils/allocation';

const Allocation = () => {
  const coffees = useStore((state) => state.coffees);
  const cuppingReports = useStore((state) => state.cuppingReports);
  
  // Enriched Data: Join coffees with their scores
  const enrichedCoffees = coffees.map(bag => {
     // Find reports for this lot
     const reports = cuppingReports.filter(r => r.lot_id === bag.lot_id);
     // Avg score
     const avgScore = reports.length > 0 
        ? reports.reduce((sum, r) => sum + r.total_score, 0) / reports.length 
        : 0;
     return { ...bag, total_score: avgScore };
  });

  const [reqs, setReqs] = useState({
    minScore: 85,
    requiredWeight: 100,
    variety: ''
  });
  
  const [recommendations, setRecommendations] = useState([]);

  const handleAllocate = () => {
    const results = allocateBags(reqs, enrichedCoffees);
    setRecommendations(results);
  };

  // Inventory Grid Logic
  const GRID_STACKS = 10; // Height (Levels 1-10)
  const GRID_PALETTES = 6; // Width (AA-AF)
  const palettes = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF'];

  const isOccupied = (p, level) => {
    const code = `${p}-${level}`;
    return enrichedCoffees.some(b => b.stock_code === code && b.status === 'Available');
  };

  const isSelected = (p, level, comboIndex) => {
     if (comboIndex === -1) return false;
     const code = `${p}-${level}`;
     const combo = recommendations[comboIndex];
     return combo && combo.bags.some(b => b.stock_code === code);
  };

  const [selectedComboIndex, setSelectedComboIndex] = useState(-1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* Controls */}
       <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h2 className="text-xl font-bold text-gray-900 mb-4">Allocation Criteria</h2>
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700">Required Weight (kg)</label>
                   <input 
                      type="number" 
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      value={reqs.requiredWeight}
                      onChange={(e) => setReqs({...reqs, requiredWeight: Number(e.target.value)})}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700">Min Score</label>
                   <input 
                      type="number" 
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      value={reqs.minScore}
                      onChange={(e) => setReqs({...reqs, minScore: Number(e.target.value)})}
                   />
                </div>
                <button 
                   onClick={handleAllocate}
                   className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded hover:bg-emerald-700"
                >
                   Find Best Allocation
                </button>
             </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Top Recommendations</h3>
                <div className="space-y-3">
                   {recommendations.map((rec, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setSelectedComboIndex(idx)}
                        className={`p-3 rounded-lg border cursor-pointer ${
                           selectedComboIndex === idx ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-gray-200'
                        }`}
                      >
                         <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900">Option {idx + 1}</span>
                            <span className="text-sm text-emerald-700 font-mono">Score: {rec.scoreDetails.total.toFixed(2)}</span>
                         </div>
                         <div className="text-xs text-gray-500 mt-1">
                            Bags: {rec.bags.map(b => b.stock_code).join(', ')}
                         </div>
                         <div className="flex justify-between text-xs mt-2 text-gray-600">
                             <span>Avg Cost: ${rec.scoreDetails.avgCost.toFixed(2)}/kg</span>
                             <span>Avg Qual: {rec.scoreDetails.avgQuality.toFixed(1)}</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}
       </div>

       {/* Warehouse Map */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Warehouse Map (Cora)</h2>
          <div className="flex justify-center">
             <div className="grid grid-cols-6 gap-2">
                {palettes.map(p => (
                   <div key={p} className="flex flex-col-reverse gap-1">
                      {Array.from({length: GRID_STACKS}, (_, i) => i + 1).map(level => {
                         const occupied = isOccupied(p, level);
                         const active = isSelected(p, level, selectedComboIndex);
                         
                         return (
                            <div 
                               key={level}
                               className={`w-10 h-10 border text-[10px] flex items-center justify-center rounded-sm
                                  ${active ? 'bg-emerald-500 border-emerald-600 text-white font-bold ring-2 ring-emerald-300 z-10' : 
                                    occupied ? 'bg-gray-800 border-gray-900 text-gray-500' : 'bg-white border-gray-200 text-gray-300'}
                               `}
                               title={`${p}-${level}`}
                            >
                               {active ? '✓' : occupied ? '' : ''}
                            </div>
                         );
                      })}
                      <div className="text-center text-xs font-bold text-gray-500 mt-1">{p}</div>
                   </div>
                ))}
             </div>
          </div>
          <div className="mt-6 flex gap-4 text-xs justify-center">
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-800 rounded-sm"></div>Occupied</div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-200 rounded-sm"></div>Empty</div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>Selected</div>
          </div>
       </div>
    </div>
  );
};

export default Allocation;
