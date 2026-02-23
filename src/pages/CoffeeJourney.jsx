import React, { useState, useMemo } from 'react';
import { useStore } from '../store/store.js';
import { advanceContractStage, getNextStage } from '../db/dbSetup';
import CoffeeMap from '../components/CoffeeMap.jsx';
import CostStepper from '../components/CostStepper.jsx';

const CoffeeJourney = () => {
  const { coffees, contracts, milestones, lots, ledger, triggerRefresh } = useStore();
  const [selectedContractId, setSelectedContractId] = useState('');
  const [costInput, setCostInput] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Memoized Logic for "God View" averages
  const { contractBags, metrics, currentStage, nextStage } = useMemo(() => {
    const bags = coffees.filter(b => b.allocated_contract_id === selectedContractId);
    const relevantMilestones = milestones.filter(m => bags.some(b => b.id === m.bag_id));
    
    if (relevantMilestones.length === 0) {
      return { contractBags: bags, metrics: null, currentStage: 'Farm', nextStage: 'Cora' };
    }

    const count = relevantMilestones.length;
    const avg = (key) => relevantMilestones.reduce((sum, m) => sum + (m[key] || 0), 0) / count;

    // Calculate average farm cost and ledger overhead from lots
    let totalFarmCost = 0;
    let totalLedgerOverhead = 0;
    
    bags.forEach(b => {
      const lot = lots.find(l => l.id === b.lot_id);
      if (lot) {
        totalFarmCost += lot.base_farm_cost_per_kg;
        const lotLedger = ledger.filter(led => led.lot_id === lot.id);
        const ledgerSum = lotLedger.reduce((sum, item) => sum + item.amount_usd, 0);
        totalLedgerOverhead += (ledgerSum / (lot.total_weight_kg || 1));
      }
    });

    const avgFarmCost = bags.length > 0 ? totalFarmCost / bags.length : 0;
    const avgLedgerOverhead = bags.length > 0 ? totalLedgerOverhead / bags.length : 0;

    const data = {
      current_stage: relevantMilestones[0].current_stage,
      final_price: avg('final_sale_price'),
      farm_cost: avgFarmCost + avgLedgerOverhead,
      logistics: ['cost_to_warehouse', 'cost_to_export', 'cost_to_import', 'cost_to_client']
                 .reduce((sum, key) => sum + avg(key), 0),
      raw_data: {
        cost_to_warehouse: avg('cost_to_warehouse'),
        cost_to_export: avg('cost_to_export'),
        cost_to_import: avg('cost_to_import'),
        cost_to_client: avg('cost_to_client')
      }
    };

    return {
      contractBags: bags,
      metrics: data,
      currentStage: data.current_stage,
      nextStage: getNextStage(data.current_stage)
    };
  }, [coffees, milestones, lots, ledger, selectedContractId]);

  const handleAdvance = async () => {
    if (!selectedContractId || !nextStage) return;
    setIsAdvancing(true);
    try {
      await advanceContractStage(selectedContractId, parseFloat(costInput) || 0);
      triggerRefresh();
      setCostInput('');
    } catch (e) {
      alert(e.message);
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
              className="w-full bg-stone-100 border-none rounded-xl p-4 text-sm font-bold"
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
            >
              <option value="">Select Active Contract</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.public_id} — {c.client_name}</option>)}
            </select>

            {selectedContractId && (
              <div className="space-y-6 animate-in fade-in duration-700">
                <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-black text-emerald-800">Status</span>
                  <span className="text-xs font-bold text-emerald-900">{currentStage}</span>
                </div>

                {nextStage && (
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-stone-400">Add Logistics Cost (${nextStage})</label>
                    <input 
                      type="number" step="0.01" value={costInput}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4"
                      placeholder="0.00 USD"
                      onChange={e => setCostInput(e.target.value)}
                    />
                    <button 
                      onClick={handleAdvance} disabled={isAdvancing}
                      className="w-full bg-emerald-600 text-white font-bold p-4 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
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
              ${(metrics?.final_price || 0).toFixed(2)}
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-zinc-800 text-[10px] uppercase font-bold text-stone-500">
              <span>Farm + Ledger: ${(metrics?.farm_cost || 0).toFixed(2)}</span>
              <span>Ops: ${(metrics?.logistics || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Map & Stepper */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white h-[500px] rounded-3xl shadow-sm border border-stone-200 p-2 relative">
          <CoffeeMap currentStage={currentStage} />
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
          <CostStepper currentStage={currentStage} costs={metrics?.raw_data} />
        </div>
      </div>
    </div>
  );
};

export default CoffeeJourney;