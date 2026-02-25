import React, { useState, useEffect, useMemo } from 'react';
import { allocateBags } from '../utils/allocation';
import { useStore } from '../store/store';
import { finalizeAllocation } from '../db/services/allocationService';
import { getInventory, getClients, applyGravity } from '../db/services/inventoryService';
import gsap from 'gsap';

const Allocation = () => {
  const { lots, refreshTrigger, fetchAll } = useStore();
  
  // Base State
  const [inventory, setInventory] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredBag, setHoveredBag] = useState(null);
  
  // The Allocation Results State (Now manually controlled)
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // The User Inputs
  const [reqs, setReqs] = useState({ 
    minScore: 80, 
    requiredWeight: 69, 
    variety: '', 
    flavorNote: '', 
    clientId: '', 
    salePrice: '' 
  });

  // Trigger GSAP animation when results change
  useEffect(() => {
    if (results.length > 0) {
      gsap.fromTo(".bag-square-selected", { scale: 0.8 }, { scale: 1.1, duration: 0.4, stagger: 0.05 });
    }
  }, [results]);

  // Map the warehouse grid visually based on current inventory
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
      const data = await getClients();
      setClients(data);
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  };

  // Background sync for when the component mounts or other pages modify data
  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (err) { 
      console.error("Sync failed:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  // Hydrate data on mount and when the global refresh trigger fires
  useEffect(() => { 
    loadInventory(); 
    loadClients(); 
  }, [refreshTrigger]);

  // --- Imperative Click Handler ---
  // This ONLY runs the algorithm when the user explicitly clicks the button.
  const handleFindOptions = async () => {
    setLoading(true);
    try {
      // 1. Get the absolute latest inventory from SQLite to ensure we don't double-book
      const data = await getInventory();
      setInventory(data); 
      
      // 2. Isolate available bags
      const availablePool = data.filter(b => b.status === 'Available');
      
      // 3. Run the algorithm based on the CURRENT inputs
      const generatedOptions = allocateBags({ 
        ...reqs, 
        minScore: parseFloat(reqs.minScore) 
      }, availablePool);
      
      // 4. Set the results to the UI
      setResults(generatedOptions);
      setSelectedIndex(0); // Reset selection to the top option
      
      // 5. Alert if nothing matches
      if (generatedOptions.length === 0) {
        alert("No allocation options found. Please adjust your criteria (e.g., lower the Min Quality Score or clear the Variety filter).");
      }
    } catch (err) {
      console.error("Failed to find options:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGravity = async () => {
    setLoading(true);
    try {
      const movedCount = await applyGravity(inventory);
      if (movedCount > 0) {
        await loadInventory();
        // Clear results since bags moved physically
        setResults([]); 
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
        const result = await finalizeAllocation(reqs.clientId, selectedBags, { 
          required_quality_score: parseFloat(reqs.minScore),
          sale_price_per_kg: parseFloat(reqs.salePrice)
        });
        
        if (result.success) {
          alert(`Contract Generated! ID: ${result.publicId}\nSale Price: $${result.salePricePerKg.toFixed(2)}/kg`);
          setResults([]); // Clear the options UI 
          await loadInventory(); // Updates local allocation grid
          
          // Tell the global store to fetch the new contract and milestones!
          await fetchAll(); 
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

  const warehouseGrid = useMemo(() => (
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
  ), [stockCodeMap, selectedBags, hoveredBag]);

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
                <option value="">All</option>
                {[...new Set((lots || []).map(l => l?.variety))].filter(Boolean).sort().map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
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
              <option value="">-- Select Client --</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Agreed Sale Price ($/kg)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
              <input 
                type="number" 
                step="0.01" 
                min="0.01"      
                required        
                value={reqs.salePrice} 
                placeholder="0.00" 
                className="w-full p-4 pl-8 bg-stone-50 rounded-2xl outline-none font-bold font-mono text-sm"
                onChange={e => setReqs({...reqs, salePrice: e.target.value})}/>
            </div>
          </div>

          <button 
            onClick={handleFindOptions} 
            disabled={loading} 
            className="w-full bg-zinc-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-colors active:scale-95"
          >
            {loading ? "Searching Engine..." : "Find Allocation Options"}
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
              
              {selectedIndex === i && (
                <div className="mt-5 space-y-3 border-t border-stone-100 pt-5 animate-in slide-in-from-top-2 duration-300">
                  <h4 className="text-[9px] font-black uppercase text-stone-400 tracking-widest">Included Bags Preview</h4>
                  
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
        
        {/* --- POSH & SLEEK HEADER & LEGEND --- */}
        <div className="flex justify-between items-center mb-16 border-b border-stone-50 pb-8">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Warehouse <span className="text-stone-300">Intake</span></h2>
          </div>
          
          <div className="flex items-center gap-6">
            
            {/* The New Elevated Legend */}
            <div className="flex bg-stone-50 p-1.5 rounded-2xl border border-stone-100 shadow-inner items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-stone-100">
                <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-stone-500">Available</span>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-stone-100">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-200"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Selected</span>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-stone-100">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm shadow-blue-200"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Allocated</span>
              </div>
            </div>
            
            <button 
              onClick={handleApplyGravity} 
              disabled={loading}
              className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-zinc-900 py-2.5 px-4 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all active:scale-95"
            >
              ⬇️ Apply Gravity
            </button>
          </div>
        </div>

        {warehouseGrid}
      </main>
    </div>
  );
};

export default Allocation;