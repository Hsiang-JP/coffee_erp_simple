import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { allocateBags } from '../utils/allocation';
import { finalizeReservation, compactWarehouse } from '../db/dbSetup';
import WarehouseGrid from '../components/WarehouseGrid';
import { VwBagDetails, Client, VarietyType } from '../types/database';

const ALLOCATION_MARKUP = 1.2;

interface AllocationReqs {
  minScore: number;
  requiredWeight: number;
  variety: VarietyType | '';
  flavorNote: string;
}

interface AllocationOption {
  strategy: string;
  bags: VwBagDetails[];
  summary: {
    avgCost: number;
    avgQual: number;
    totalWeight: number;
  };
}

const Allocation: React.FC = () => {
  const { coffees, clients, syncStore, refreshTrigger } = useStore();
  
  const [reqs, setReqs] = useState<AllocationReqs>({ 
    minScore: 80, 
    requiredWeight: 138,
    variety: '',
    flavorNote: ''
  });
  const [results, setResults] = useState<AllocationOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');

  // Sync data on mount or when DB changes
  useEffect(() => { syncStore(); }, [refreshTrigger, syncStore]);

  // Agent 3: Re-run optimization automatically if inventory updates while results are visible
  useEffect(() => {
    if (coffees.length > 0 && results.length > 0) {
        handleRun();
    }
  }, [coffees]);

  const handleRun = () => {
    const options = allocateBags(reqs as any, coffees || []);
    setResults(options);
    if (options.length === 0) alert("No matching inventory found.");
  };

  const handleFinalize = async () => {
    if (!selectedClientId) {
      alert("Please select a client.");
      return;
    }

    const selectedOption = results[selectedIndex];
    const bagIds = selectedOption.bags.map(b => b.id);

    const contractData = {
      client_id: selectedClientId,
      sale_price_per_kg: selectedOption.summary.avgCost * ALLOCATION_MARKUP, // Example 20% markup
      required_quality_score: selectedOption.summary.avgQual,
      required_flavor_profile: reqs.flavorNote || 'Standard',
      variety: reqs.variety
    };

    try {
      await finalizeReservation(contractData, bagIds);
      await syncStore();
      setResults([]);
      setIsModalOpen(false);
      alert("Contract finalized successfully!");
    } catch (err: any) {
      console.error("Finalization failed:", err);
      alert("Error finalizing contract: " + err.message);
    }
  };

  const selectedOption = results[selectedIndex];

  return (
    <div className="flex flex-col md:flex-row gap-8 p-6 bg-stone-50 min-h-screen">
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-xs uppercase tracking-widest text-stone-400 font-bold mb-4">Criteria</h2>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Required Weight (kg)</label>
              <input 
                type="number" 
                value={reqs.requiredWeight} 
                className="w-full p-3 bg-stone-50 rounded-lg text-sm outline-none focus:ring-1 focus:ring-stone-200" 
                onChange={e => setReqs({...reqs, requiredWeight: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Min Quality Score</label>
              <input 
                type="number" 
                value={reqs.minScore} 
                className="w-full p-3 bg-stone-50 rounded-lg text-sm outline-none focus:ring-1 focus:ring-stone-200" 
                onChange={e => setReqs({...reqs, minScore: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Variety</label>
              <select 
                value={reqs.variety} 
                className="w-full p-3 bg-stone-50 rounded-lg text-sm outline-none focus:ring-1 focus:ring-stone-200" 
                onChange={e => setReqs({...reqs, variety: e.target.value as VarietyType | ''})}
              >
                <option value="">All Varieties</option>
                <option value="Typica">Typica</option>
                <option value="Caturra">Caturra</option>
                <option value="Catuai">Catuai</option>
                <option value="Geisha">Geisha</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Flavor Note</label>
              <input 
                type="text" 
                value={reqs.flavorNote} 
                placeholder="e.g. Jasmine" 
                className="w-full p-3 bg-stone-50 rounded-lg text-sm outline-none focus:ring-1 focus:ring-stone-200" 
                onChange={e => setReqs({...reqs, flavorNote: e.target.value})}
              />
            </div>
            <button onClick={handleRun} className="w-full bg-zinc-900 text-white p-4 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all">Optimize Allocation</button>
          </div>
        </div>

        <div className="space-y-3">
          {results.map((opt, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedIndex(i)} 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedIndex === i ? 'border-emerald-500 bg-emerald-50' : 'bg-white border-stone-100 hover:border-stone-200'}`}
            >
              <div className="flex justify-between font-bold text-xs uppercase">
                <span>{opt.strategy}</span> 
                <span className="text-emerald-600">{opt.summary.avgQual.toFixed(1)} pts</span>
              </div>
              <div className="text-[10px] text-stone-400 mt-1">
                Avg Cost: ${opt.summary.avgCost.toFixed(2)}/kg • Total: {opt.summary.totalWeight}kg
              </div>
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
          >
            Finalize Contract
          </button>
        )}
      </div>

      {/* Warehouse Visualization & Manual Trigger */}
      <div className="flex-1 flex flex-col gap-6">
        <WarehouseGrid 
          coffees={coffees} 
          selectedBags={results[selectedIndex]?.bags || []} 
        />
        
        <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm flex items-center justify-between">
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-stone-900">Warehouse Optimization</h3>
                <p className="text-[10px] text-stone-400 font-mono uppercase mt-1">Gravity Drop Protocol • Consolidate Ground Level</p>
            </div>
            <button 
                onClick={async () => {
                    try {
                        await compactWarehouse();
                    } catch (err: any) {
                        alert("Optimization failed: " + err.message);
                    }
                }}
                className="flex items-center gap-3 px-8 py-4 bg-stone-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl active:scale-95"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                </svg>
                Resort Warehouse
            </button>
        </div>
      </div>

      {/* Finalize Modal */}
      {isModalOpen && selectedOption && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-stone-200 animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-stone-100">
              <h3 className="text-2xl font-bold text-stone-900">Finalize Reservation</h3>
              <p className="text-stone-500 mt-1">Review allocation details before creating the contract.</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-stone-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Selection Summary</span>
                  <div className="text-lg font-bold">
                    {selectedOption.bags.length} Bags of {reqs.variety || 'Mixed Variety'}
                  </div>
                  <div className="text-sm text-stone-500">
                    Total Weight: {selectedOption.summary.totalWeight} kg
                  </div>
                </div>
                <div className="bg-stone-50 p-4 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Quality & Cost</span>
                  <div className="text-lg font-bold text-emerald-600">
                    {selectedOption.summary.avgQual.toFixed(1)} pts
                  </div>
                  <div className="text-sm text-stone-500">
                    Avg Cost: ${selectedOption.summary.avgCost.toFixed(2)}/kg
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-stone-400 mb-2 block">Assign to Client</label>
                <select 
                  value={selectedClientId} 
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full p-4 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="">Select a client...</option>
                  {clients.map((c: Client) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.destination_city || 'No City'})</option>
                  ))}
                </select>
              </div>

              <div className="max-h-48 overflow-y-auto border border-stone-100 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 sticky top-0">
                    <tr>
                      <th className="p-3 font-bold text-stone-400 text-[10px] uppercase">Bag ID</th>
                      <th className="p-3 font-bold text-stone-400 text-[10px] uppercase">Weight</th>
                      <th className="p-3 font-bold text-stone-400 text-[10px] uppercase">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {selectedOption.bags.map(b => (
                      <tr key={b.id}>
                        <td className="p-3 font-mono text-xs">{b.public_id}</td>
                        <td className="p-3">{b.weight_kg} kg</td>
                        <td className="p-3 text-stone-500">{b.stock_code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-8 bg-stone-50 flex gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest text-stone-400 hover:text-stone-600 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleFinalize}
                className="flex-1 bg-zinc-900 text-white px-6 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg"
              >
                Confirm & Create Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Allocation;
