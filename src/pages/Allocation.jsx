import React, { useState, useEffect, useMemo } from 'react';
import { execute } from '../db/dbSetup';
import { allocateBags } from '../utils/allocation';
import { useStore } from '../store/store';
import { finalizeAllocation } from '../db/services/allocationService'; // Import finalizeAllocation
import gsap from 'gsap';

const Allocation = () => {
  const { lots, cuppingReports, refreshTrigger } = useStore(); // Destructure lots, cuppingReports, and refreshTrigger from the store
  const [inventory, setInventory] = useState([]);
  const [reqs, setReqs] = useState({ minScore: 82, requiredWeight: 276, variety: '', flavorNote: '', clientId: '' });
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [availableVarieties, setAvailableVarieties] = useState([]);
  const [availableFlavorNotes, setAvailableFlavorNotes] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State for confirmation modal
  const [hoveredBag, setHoveredBag] = useState(null); // State for hovered bag details

  // Add a memoized map for efficient lookups
  const stockCodeMap = useMemo(() => {
    return new Map(inventory.map(bag => [bag.stock_code, bag]));
  }, [inventory]);

  // DB-First Fetch: Use a broader query for the map, but filter Available for optimization
  const loadInventory = async () => {
    setLoading(true);
    // Fetch all bags with lot and cupping info for the map
    const data = await execute(`
      SELECT b.*, l.variety, l.process_method, f.name as farm_name,
      COALESCE((SELECT AVG(total_score) FROM cupping_sessions WHERE lot_id = b.lot_id), 80.0) AS quality_score
      FROM bags b
      JOIN lots l ON b.lot_id = l.id
      JOIN farms f ON l.farm_id = f.id
    `);
    setInventory(data);
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
    gsap.from(".pallet-column", { opacity: 0, y: 20, stagger: 0.1, duration: 0.8 });
  }, [refreshTrigger]);

  useEffect(() => {
    // Extract unique varieties
    const uniqueVarieties = [...new Set(lots.map(lot => lot.variety).filter(Boolean))];
    setAvailableVarieties(['', ...uniqueVarieties.sort()]); // Add empty option and sort

    // Extract unique primary flavor notes
    const uniqueFlavorNotes = [...new Set(cuppingReports.map(report => report.primary_flavor_note).filter(Boolean))];
    setAvailableFlavorNotes(['', ...uniqueFlavorNotes.sort()]); // Add empty option and sort
  }, [lots, cuppingReports]);

  const handleRun = () => {
    // Only Available bags go into the optimizer
    let pool = inventory.filter(b => b.status === 'Available');

    if (reqs.variety) {
      pool = pool.filter(bag => bag.variety === reqs.variety);
    }
    if (reqs.flavorNote) {
      pool = pool.filter(bag => bag.primary_flavor_note && bag.primary_flavor_note.toLowerCase().includes(reqs.flavorNote.toLowerCase()));
    }

    const options = allocateBags(reqs, pool);
    setResults(options);
    if (options.length > 0) {
      gsap.fromTo(".bag-square-selected", 
        { scale: 0.8, filter: "brightness(2)" }, 
        { scale: 1.1, filter: "brightness(1)", duration: 0.4, stagger: 0.05 }
      );
    }
  };

  const handleFinalizeReservation = async () => {
    if (!reqs.clientId) {
      alert('Please enter a Client ID to finalize the reservation.');
      return;
    }
    if (selectedBags.length === 0) {
      alert('No bags selected for reservation.');
      return;
    }

    if (window.confirm('Are you sure you want to finalize this reservation?')) {
      try {
        setLoading(true);
        const contractDetails = { 
          required_quality_score: parseFloat(reqs.minScore) 
        };
        const result = await finalizeAllocation(reqs.clientId, selectedBags, contractDetails);
        if (result.success) {
          alert(`Successful: Reservation finalized! Contract ID: ${result.publicId}, Sale Price: $${result.salePricePerKg.toFixed(2)}/kg`);
          loadInventory(); // Reload inventory to reflect allocated bags
          // GSAP animation for allocated bags - will be handled by re-render with updated inventory
        } else {
          alert('Failed to finalize reservation.');
        }
      } catch (error) {
        console.error('Error finalizing reservation:', error);
        alert(`Error finalizing reservation: ${error.message}`);
      } finally {
        setLoading(false);
        setShowConfirmModal(false);
      }
    }
  };

  const palettes = useMemo(() => {
    const fromInventory = [...new Set(inventory.map(b => b.stock_code?.split('-')[0]))].filter(Boolean);
    const defaults = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF'];
    return [...new Set([...defaults, ...fromInventory])].sort();
  }, [inventory]);

  const levels = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  const selectedBags = results[selectedIndex]?.bags || [];

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-8 bg-[#F9F7F2] min-h-screen font-sans text-zinc-900">
      {/* Configuration Panel */}
      <aside className="w-full lg:w-96 space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-light tracking-tight">Smart <span className="font-bold">Allocation</span></h1>
          <p className="text-zinc-400 text-sm mt-2">AI-driven inventory fulfillment</p>
        </header>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/60">
          <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-4">Contract Requirements</label>
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-zinc-400 ml-1">Minimum SCA Score</span>
              <input type="range" min="80" max="95" step="0.5" value={reqs.minScore} 
                className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                onChange={e => setReqs({...reqs, minScore: e.target.value})}/>
              <div className="flex justify-between text-xs font-medium mt-1"><span>80</span><span className="text-emerald-600">{reqs.minScore}</span><span>95</span></div>
            </div>
            
            <input type="number" value={reqs.requiredWeight} placeholder="Weight (kg)" 
              className="w-full p-4 bg-zinc-50 border border-transparent focus:border-zinc-200 focus:bg-white rounded-xl transition-all outline-none" 
              onChange={e => setReqs({...reqs, requiredWeight: e.target.value})}/>
            
            <div>
              <span className="text-[10px] text-zinc-400 ml-1">Variety</span>
              <select
                value={reqs.variety}
                onChange={e => setReqs({...reqs, variety: e.target.value})}
                className="w-full p-4 bg-zinc-50 border border-transparent focus:border-zinc-200 focus:bg-white rounded-xl transition-all outline-none"
              >
                {availableVarieties.map(v => (
                  <option key={v} value={v}>{v || 'Any Variety'}</option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 ml-1">Flavor Note</span>
              <input
                type="text"
                value={reqs.flavorNote}
                placeholder="e.g., Citrus, Chocolate"
                className="w-full p-4 bg-zinc-50 border border-transparent focus:border-zinc-200 focus:bg-white rounded-xl transition-all outline-none"
                onChange={e => setReqs({...reqs, flavorNote: e.target.value})}
              />
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 ml-1">Client ID</span>
              <input
                type="text"
                value={reqs.clientId}
                placeholder="e.g., CLNT001"
                className="w-full p-4 bg-zinc-50 border border-transparent focus:border-zinc-200 focus:bg-white rounded-xl transition-all outline-none"
                onChange={e => setReqs({...reqs, clientId: e.target.value})}
              />
            </div>

            <button onClick={handleRun} disabled={loading}
              className="w-full bg-zinc-900 text-white p-5 rounded-xl font-bold uppercase text-[11px] tracking-[0.3em] hover:bg-black active:scale-[0.98] transition-all shadow-xl shadow-zinc-200">
              {loading ? "Syncing..." : "Optimize Selection"}
            </button>
          </div>
        </section>

        {/* Results List */}
        <div className="space-y-3">
          {results.map((opt, i) => (
            <button key={i} onClick={() => setSelectedIndex(i)} 
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all group ${selectedIndex === i ? 'border-emerald-500 bg-white' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{opt.strategyName}</span>
                <span className="text-xs font-bold text-emerald-600">{opt.summary.avgQual.toFixed(2)} pts</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xl font-light">${opt.summary.avgCost.toFixed(2)}<small className="text-[10px] text-zinc-400">/kg</small></span>
                <span className={`text-[10px] font-bold p-1 px-2 rounded-md ${opt.summary.totalPriority > 0.7 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  EFFICIENCY: {(opt.summary.totalPriority * 100).toFixed(0)}%
                </span>
              </div>
              {selectedIndex === i && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleFinalizeReservation(); }} 
                  disabled={loading || selectedBags.length === 0}
                  className="mt-4 w-full bg-emerald-600 text-white p-3 rounded-lg font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200"
                >
                  {loading ? "Finalizing..." : "Finalize Reservation"}
                </button>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Warehouse Visualizer */}
      <main className="flex-1 bg-white p-10 rounded-[2.5rem] shadow-sm border border-zinc-200/60 relative overflow-hidden">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-2xl font-medium tracking-tight">Warehouse: <span className="text-zinc-400">Cora (Lima)</span></h2>
            <p className="text-xs text-zinc-400 mt-1">Real-time shelf availability and level mapping</p>
          </div>
          <div className="flex gap-4 text-[10px] font-bold tracking-widest uppercase">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-zinc-900 rounded-sm"></span> Available</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> Selected</div>
            <div className="flex items-center gap-2 opacity-20"><span className="w-3 h-3 bg-zinc-200 rounded-sm"></span> Shipped</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-sm border-2 border-blue-700"></span> Allocated</div>
          </div>
        </div>

        <div className="flex gap-6 justify-center">
          {palettes.map(p => (
            <div key={p} className="pallet-column flex flex-col gap-2">
              {levels.map(l => {
                const code = `${p}-${l}`;
                const bag = stockCodeMap.get(code);
                const isSelected = selectedBags.some(b => b.stock_code === code);
                const isAllocated = bag?.status === 'Allocated';
                
                return (
                  <div key={l} 
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-300 relative
                      ${isSelected ? 'bg-emerald-500 border-emerald-600 scale-110 shadow-xl shadow-emerald-200 z-10 bag-square-selected' : 
                        isAllocated ? 'bg-blue-500 border-blue-700 border-4' : // Allocated style
                        bag?.status === 'Available' ? 'bg-zinc-900 border-zinc-950 hover:bg-zinc-800 cursor-pointer' : 
                        'bg-zinc-50 border-zinc-100 opacity-10'}
                    `}
                    onMouseEnter={() => bag && setHoveredBag(bag)}
                    onMouseLeave={() => setHoveredBag(null)}
                  >
                    {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                    {bag?.status === 'Available' && !isSelected && (
                       <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-zinc-700"></span>
                    )}
                    {hoveredBag && hoveredBag.stock_code === code && (
                      <div className="absolute bottom-full mb-2 p-2 bg-zinc-800 text-white text-xs rounded-md shadow-lg z-20 whitespace-nowrap">
                        <p>Farm: {hoveredBag.farm_name}</p>
                        <p>Variety: {hoveredBag.variety}</p>
                        <p>Weight: {hoveredBag.weight_kg} kg</p>
                        <p>Score: {hoveredBag.score}</p>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="text-center text-[11px] font-black text-zinc-300 mt-4 tracking-tighter">{p}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Allocation;