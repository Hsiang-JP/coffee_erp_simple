import React, { useState, useEffect, useMemo } from 'react';
import { execute } from '../db/dbSetup';
import { allocateBags } from '../utils/allocation';
import { useStore } from '../store/store';
import { finalizeAllocation } from '../db/services/allocationService';
import gsap from 'gsap';

const Allocation = () => {
  const { lots, cuppingReports, refreshTrigger } = useStore();
  const [inventory, setInventory] = useState([]);
  // ADDED: salePrice to state
  const [reqs, setReqs] = useState({ minScore: 82, requiredWeight: 276, variety: '', flavorNote: '', clientId: '', salePrice: '' });
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hoveredBag, setHoveredBag] = useState(null);
  const [clients, setClients] = useState([]);

  const stockCodeMap = useMemo(() => {
    const map = new Map();
    inventory.forEach(bag => {
      if (bag.stock_code) {
        const parts = bag.stock_code.split('-');
        if (parts.length === 2) {
          const pallet = parts[0].trim().toUpperCase();
          const level = parseInt(parts[1], 10);
          map.set(`${pallet}-${level}`, bag);
        }
      }
    });
    return map;
  }, [inventory]);

  const loadClients = async () => {
    try {
      const data = await execute(`SELECT * FROM clients ORDER BY name ASC`);
      setClients(data);
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  };

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await execute(`
        SELECT 
          b.*, 
          l.public_id, 
          l.variety, 
          l.process_method, 
          (l.base_farm_cost_per_kg + COALESCE((SELECT SUM(amount_usd) FROM cost_ledger WHERE lot_id = l.id), 0) / NULLIF(l.total_weight_kg, 1)) AS current_per_kg_cost,
          (l.base_farm_cost_per_kg + COALESCE((SELECT SUM(amount_usd) FROM cost_ledger WHERE lot_id = l.id), 0) / NULLIF(l.total_weight_kg, 1)) AS base_farm_cost_per_kg,
          f.name as farm_name,
          cs.final_score AS quality_score,
          cs.primary_flavor_note,
          cs.notes as cupping_notes
        FROM bags b
        JOIN lots l ON b.lot_id = l.id
        JOIN farms f ON l.farm_id = f.id
        LEFT JOIN cupping_sessions cs ON l.id = cs.lot_id
        WHERE b.status IN ('Available', 'Allocated') 
      `);
      setInventory(data);
    } catch (err) { 
      console.error("Sync failed:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    loadInventory(); 
    loadClients(); 
  }, [refreshTrigger]);

  const handleRun = () => {
    let pool = inventory.filter(b => b.status === 'Available');
    const options = allocateBags({ ...reqs, minScore: parseFloat(reqs.minScore) }, pool);
    setResults(options);
    if (options.length > 0) {
      gsap.fromTo(".bag-square-selected", { scale: 0.8 }, { scale: 1.1, duration: 0.4, stagger: 0.05 });
    } else {
      alert("No bags match these criteria.");
    }
  };

  const handleApplyGravity = async () => {
    setLoading(true);
    try {
      const pallets = {};
      inventory.forEach(bag => {
        if (!bag.stock_code) return;
        const [p, l] = bag.stock_code.split('-');
        if (!pallets[p]) pallets[p] = [];
        pallets[p].push({ id: bag.id, level: parseInt(l, 10) });
      });

      let movedCount = 0;

      for (const p in pallets) {
        pallets[p].sort((a, b) => a.level - b.level);
        let targetLevel = 1; 
        
        for (const bag of pallets[p]) {
          if (bag.level !== targetLevel) {
            await execute(
              `UPDATE bags SET stock_code = ? WHERE id = ?`, 
              [`${p}-${targetLevel}`, bag.id]
            );
            movedCount++;
          }
          targetLevel++; 
        }
      }

      if (movedCount > 0) {
        await loadInventory();
      } else {
        alert("Shelves are already consolidated. No floating bags detected.");
      }
    } catch (error) {
      console.error("Gravity failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeReservation = async () => {
    if (!reqs.clientId) {
      alert('Please select a Client to generate the contract.');
      return;
    }
    // ADDED: Guard to ensure Sale Price is entered
    if (!reqs.salePrice || parseFloat(reqs.salePrice) <= 0) {
      alert('Please enter a valid Agreed Sale Price ($/kg).');
      return;
    }
    if (selectedBags.length === 0) {
      alert('No bags selected.');
      return;
    }

    const clientName = clients.find(c => c.id === reqs.clientId)?.name || reqs.clientId;

    if (window.confirm(`Generate contract for Client: ${clientName} at $${reqs.salePrice}/kg?`)) {
      try {
        setLoading(true);
        // ADDED: Passing sale_price_per_kg to backend
        const result = await finalizeAllocation(reqs.clientId, selectedBags, { 
          required_quality_score: parseFloat(reqs.minScore),
          sale_price_per_kg: parseFloat(reqs.salePrice)
        });
        
        if (result.success) {
          alert(`Contract Generated! ID: ${result.publicId}\nSale Price: $${result.salePricePerKg.toFixed(2)}/kg`);
          await loadInventory(); 
        }
      } catch (error) {
        alert(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const palettes = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF'];
  const levels = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const selectedBags = results[selectedIndex]?.bags || [];

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-8 bg-[#F9F7F2] min-h-screen font-sans">
      
      {/* --- Sidebar UI --- */}
      <aside className="w-full lg:w-96 space-y-6 flex-shrink-0">
        <header className="mb-8">
          <h1 className="text-3xl font-light tracking-tight">Smart <span className="font-bold">Allocation</span></h1>
        </header>
        
        <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Weight (kg)</label>
              <input type="number" value={reqs.requiredWeight} placeholder="kg" 
                className="w-full p-4 bg-stone-50 rounded-2xl outline-none font-bold"
                onChange={e => setReqs({...reqs, requiredWeight: e.target.value})}/>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Variety</label>
              <select value={reqs.variety} onChange={e => setReqs({...reqs, variety: e.target.value})} className="w-full p-4 bg-stone-50 rounded-2xl outline-none font-bold text-sm">
                <option value="">All Varieties</option>
                {[...new Set(lots.map(l => l.variety))].filter(Boolean).sort().map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Min Quality Score: {reqs.minScore}</label>
            <input type="range" min="80" max="95" step="0.5" value={reqs.minScore} className="w-full accent-zinc-900" onChange={e => setReqs({...reqs, minScore: e.target.value})}/>
          </div>
          
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Flavor/Note Search</label>
            <input type="text" value={reqs.flavorNote} placeholder="e.g. Citrus, Honey" className="w-full p-4 bg-stone-50 rounded-2xl outline-none font-medium text-sm" onChange={e => setReqs({...reqs, flavorNote: e.target.value})}/>
          </div>
          
          <div className="pt-4 border-t border-stone-100">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Assign to Client</label>
            <select 
              value={reqs.clientId} 
              onChange={e => setReqs({...reqs, clientId: e.target.value})}
              className="w-full p-4 bg-stone-50 rounded-2xl outline-none font-bold text-sm text-zinc-800 transition-all focus:ring-2 focus:ring-stone-200"
            >
              <option value="">-- Select Registered Client --</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          {/* ADDED: Agreed Sale Price Input */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Agreed Sale Price ($/kg)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
              <input type="number" step="0.01" value={reqs.salePrice} placeholder="0.00" 
                className="w-full p-4 pl-8 bg-stone-50 rounded-2xl outline-none font-bold font-mono text-sm"
                onChange={e => setReqs({...reqs, salePrice: e.target.value})}/>
            </div>
          </div>

          <button onClick={handleRun} disabled={loading} className="w-full bg-zinc-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-colors">
            {loading ? "Syncing..." : "Optimize Selection"}
          </button>
        </div>

        <div className="space-y-3">
          {results.map((opt, i) => (
            <div key={i} className={`w-full p-6 rounded-[2rem] border-2 transition-all text-left ${selectedIndex === i ? 'border-emerald-500 bg-white shadow-xl' : 'border-transparent opacity-50'}`}>
              <button onClick={() => setSelectedIndex(i)} className="w-full text-left">
                <p className="text-[10px] font-black uppercase text-stone-400">{opt.strategyName}</p>
                <div className="flex justify-between items-baseline mt-1">
                  <h3 className="text-2xl font-black">${opt.summary.avgCost.toFixed(2)}<span className="text-xs text-stone-400 font-medium">/kg True Cost</span></h3>
                  <span className="text-[10px] font-bold text-stone-500 uppercase">{opt.bags.length} Bags</span>
                </div>
              </button>
              
              {/* ADDED: Detailed Bag List Preview */}
              {selectedIndex === i && (
                <div className="mt-5 space-y-3 border-t border-stone-100 pt-5 animate-in slide-in-from-top-2 duration-300">
                  <h4 className="text-[9px] font-black uppercase text-stone-400 tracking-widest">Included Bags Preview</h4>
                  
                  {/* Scrollable list so it doesn't break the UI if they select 50 bags */}
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {opt.bags.map(bag => (
                      <div key={bag.id} className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <div>
                          <span className="font-bold text-zinc-800 block text-xs">{bag.public_id}</span>
                          <span className="text-[9px] text-stone-400 uppercase tracking-widest">{bag.farm_name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-emerald-600 font-bold text-xs block">${bag.current_per_kg_cost?.toFixed(2)}/kg</span>
                          <span className="text-[9px] font-bold text-amber-500">{bag.quality_score ? bag.quality_score + ' pts' : 'No QC'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    onClick={handleFinalizeReservation}
                    disabled={loading}
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-200"
                  >
                    Generate Contract
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* --- Warehouse Grid --- */}
      <main className="flex-1 bg-white p-12 rounded-[3rem] shadow-sm border border-stone-100 min-w-[700px]">
        <div className="flex justify-between items-center mb-16 border-b border-stone-50 pb-8">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Warehouse <span className="text-stone-300">Intake</span></h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest text-stone-400">
               <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-zinc-900 rounded-sm"></div> In Stock</span>
               <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div> Selected</span>
            </div>
            
            <button 
              onClick={handleApplyGravity} 
              disabled={loading}
              className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-zinc-900 py-2 px-4 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all active:scale-95"
            >
              ⬇️ Apply Gravity
            </button>
          </div>
        </div>

        <div className="flex gap-8 justify-center relative">
          {palettes.map(p => (
            <div key={p} className="pallet-column flex flex-col gap-3">
              {levels.map(l => {
                const code = `${p}-${l}`;
                const bag = stockCodeMap.get(code);
                const isSelected = selectedBags.some(b => b.id === bag?.id);
                const isAllocated = bag?.status === 'Allocated';
                return (
                  <div key={l} 
                    className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ease-bounce relative
                      ${isSelected ? 'bg-emerald-500 border-emerald-600 scale-110 shadow-xl shadow-emerald-200 z-10 bag-square-selected' : 
                        isAllocated ? 'bg-blue-600 border-blue-800' : 
                        bag ? 'bg-zinc-900 border-zinc-950 hover:bg-black cursor-pointer' : 
                        'bg-stone-50 border-stone-100 opacity-20'}
                    `}
                    onMouseEnter={() => bag && setHoveredBag(bag)}
                    onMouseLeave={() => setHoveredBag(null)}
                  >
                    {isSelected && <span className="text-white font-black text-xs">✓</span>}
                    
                    {hoveredBag && hoveredBag.id === bag?.id && (
                      <div className="absolute bottom-full mb-4 p-5 bg-zinc-900 text-white rounded-2xl shadow-2xl z-[100] border border-zinc-800 min-w-[170px] pointer-events-none">
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">
                          {hoveredBag.farm_name}
                        </p>
                        <div className="flex justify-between items-baseline mb-3">
                          <p className="text-xs font-bold">{hoveredBag.public_id}</p>
                          <p className="text-[9px] font-medium text-stone-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                            {hoveredBag.variety || 'Unknown'}
                          </p>
                        </div>

                        <div className="flex justify-between border-t border-zinc-800 pt-3 text-[9px] font-black uppercase text-stone-500">
                          <span>True Cost</span>
                          <span className="text-emerald-400 font-mono font-bold">
                            ${hoveredBag.current_per_kg_cost?.toFixed(2)}/kg
                          </span>
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] font-black uppercase text-stone-500">
                          <span>Quality</span>
                          <span className={hoveredBag.quality_score ? "text-white" : "text-amber-400 font-bold"}>
                            {hoveredBag.quality_score ? hoveredBag.quality_score : "PENDING QC"}
                          </span>
                        </div>
                        
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-zinc-800 rotate-45"></div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="text-center text-[10px] font-black text-stone-300 mt-4">{p}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Allocation;