import React, { useState, useMemo } from 'react';
import { useStore } from '../store/store.js';
import { getNextStage } from '../db/dbSetup';
import { useAdvanceStage } from '../hooks/useCoffeeData';
import CoffeeMap from '../components/CoffeeMap.jsx';
import CostStepper from '../components/CostStepper.jsx';

const CoffeeJourney = () => {
  const { coffees, contracts, lots, contractMetrics } = useStore();
  const [selectedContractId, setSelectedContractId] = useState('');
  const [costInput, setCostInput] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const advanceStage = useAdvanceStage();

  // 1. Simplified Logic: Use pre-calculated metrics from the store
  const { contractBags, metrics, currentStage, nextStage, varieties } = useMemo(() => {
    // Filter bags for this contract and attach variety from the lots table
    const bags = coffees
      .filter(b => b.contract_id === selectedContractId)
      .map(b => ({
        ...b,
        variety: lots.find(l => l.id === b.lot_id)?.variety || 'Unknown'
      }));

    const contractMetric = contractMetrics.find(m => m.contract_id === selectedContractId);
    const contractVarieties = [...new Set(bags.map(b => b.variety))];

    if (!contractMetric || bags.length === 0) {
      return { 
        contractBags: bags, 
        metrics: null, 
        currentStage: 'Farm', 
        nextStage: 'Cora',
        varieties: contractVarieties
      };
    }

    return {
      contractBags: bags,
      metrics: {
        total_landed: contractMetric.total_landed,
        farm_cost: contractMetric.farm_cost,
        ops_cost: contractMetric.ops_cost,
        total_weight: contractMetric.total_weight,
        raw_data: {
          cost_to_warehouse: contractMetric.cost_to_warehouse_per_kg,
          cost_to_export: contractMetric.cost_to_export_per_kg,
          cost_to_import: contractMetric.cost_to_import_per_kg,
          cost_to_client: contractMetric.cost_to_client_per_kg,
        }
      },
      currentStage: contractMetric.current_stage,
      nextStage: getNextStage(contractMetric.current_stage),
      varieties: contractVarieties
    };
  }, [coffees, lots, selectedContractId, contractMetrics]);

  const handleAdvance = async () => {
    if (!selectedContractId || !nextStage) return;
    setIsAdvancing(true);
    try {
      await advanceStage(selectedContractId, parseFloat(costInput) || 0);
      setCostInput('');
      // If triggerRefresh() is called in the hook, the useMemo will automatically recalculate!
    } catch (e) { 
      console.error("Advance Error:", e); // Check the DevTools Console!
      alert("Failed: " + e.message); 
    } finally { 
      setIsAdvancing(false); 
    }
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-stone-50 min-h-screen p-6">
      {/* Sidebar: Control Panel */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-8 bg-zinc-950 text-white">
            <h2 className="text-2xl font-light tracking-tight">Trace the <span className="font-bold">Journey</span></h2>
            <p className="text-stone-500 text-[10px] uppercase tracking-widest mt-1">Live Traceability Engine</p>
          </div>

          <div className="p-8 space-y-8">
            <select 
              className="w-full bg-stone-100 border-none rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
            >
              <option value="">Select Active Contract</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.public_id} — {c.client_name}</option>)}
            </select>

            {selectedContractId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                {/* Status Card */}
                <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-black text-emerald-800 tracking-widest">Status</span>
                  <span className="text-xs font-bold text-emerald-900">{currentStage}</span>
                </div>

                {/* Contract Details Section */}
                <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-4">
                  <div className="flex justify-between items-center border-b border-stone-200 pb-3">
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-widest">Sale Price</span>
                    <span className="text-sm font-black text-zinc-900">
                      ${(contracts.find(c => c.id === selectedContractId)?.sale_price_per_kg || 0).toFixed(2)}
                      <span className="text-[10px] text-stone-400 font-medium ml-1">/KG</span>
                    </span>
                  </div>
                  
                  {/* ADDED: Total Weight Display */}
                  <div className="flex justify-between items-center border-b border-stone-200 pb-3">
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-widest">Total Weight</span>
                    <span className="text-sm font-black text-zinc-900">
                      {metrics?.total_weight || 0}
                      <span className="text-[10px] text-stone-400 font-medium ml-1">KG</span>
                    </span>
                  </div>
                  
                  <div className="space-y-2 pt-1">
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-widest block">Varieties</span>
                    <div className="flex flex-wrap gap-1.5">
                      {varieties.map(v => (
                        <span key={v} className="bg-white px-2.5 py-1 rounded-lg text-[10px] font-bold text-zinc-600 border border-stone-200 shadow-sm">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Logistics Input */}
                {nextStage && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] uppercase font-black text-stone-400">Add Logistics Cost (${nextStage})</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                      <input 
                        type="number" step="0.01" value={costInput}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 pl-8 font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder="0.00"
                        onChange={e => setCostInput(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handleAdvance} disabled={isAdvancing}
                      className="w-full bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest p-5 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isAdvancing ? 'Processing...' : `Move to ${nextStage}`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ledger Footer */}
          <div className="bg-zinc-950 p-8 text-white">
            <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-2">Total Landed Value (Avg/KG)</p>
            <div className="text-5xl font-mono font-bold text-emerald-400 tracking-tighter">
              ${(metrics?.total_landed || 0).toFixed(2)}
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-zinc-800 text-[10px] uppercase font-bold text-stone-500">
              <span>Farm + Ledger: ${(metrics?.farm_cost || 0).toFixed(2)}</span>
              <span>Ops: ${(metrics?.ops_cost || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Map & Stepper */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white h-[500px] rounded-3xl shadow-sm border border-stone-200 p-2 relative overflow-hidden">
          <CoffeeMap 
            currentStage={currentStage} 
            bags={contractBags} 
            contractId={selectedContractId} 
          />
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
          <CostStepper currentStage={currentStage} costs={metrics?.raw_data} />
        </div>
      </div>
    </div>
  );
};

export default CoffeeJourney;