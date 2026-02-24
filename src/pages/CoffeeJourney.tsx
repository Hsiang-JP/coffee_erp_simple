import React, { useState, useMemo } from 'react';
import { useStore } from '../store/store';
import { advanceContractStage, getNextStage } from '../db/dbSetup';
import CoffeeMap from '../components/CoffeeMap';
import CostStepper from '../components/CostStepper';
import { StageType } from '../types/database';

interface JourneyMetrics {
  current_stage: StageType;
  final_price: number;
  total_weight: number;
  total_contract_cost: number;
  logistics: number;
  farm_cost: number;
  sale_price: number;
  raw_data: {
    cost_to_warehouse: number;
    cost_to_export: number;
    cost_to_import: number;
    cost_to_client: number;
  };
}

const CoffeeJourney: React.FC = () => {
  const { contracts, contractMetrics, triggerRefresh } = useStore();
  const [selectedContractId, setSelectedContractId] = useState('');
  const [costInput, setCostInput] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);

  const { metrics, currentStage, nextStage, contractStatus } = useMemo(() => {
    const contract = contracts.find(c => c.id === selectedContractId);
    const data = contractMetrics.find(m => m.contract_id === selectedContractId);
    
    if (!contract) {
      return { metrics: null, currentStage: 'Farm' as StageType, nextStage: 'Cora' as StageType, contractStatus: 'Unknown' };
    }

    const stage = (data?.current_stage || contract.current_stage || 'Farm') as StageType;
    
    const formattedData: JourneyMetrics = {
      current_stage: stage,
      final_price: data?.avg_landed_cost || 0,
      total_weight: data?.total_weight || 0,
      total_contract_cost: data?.total_contract_cost || 0,
      logistics: (data?.avg_to_warehouse || 0) + (data?.avg_to_export || 0) + (data?.avg_to_import || 0) + (data?.avg_to_client || 0),
      farm_cost: data?.avg_farm_cost || 0,
      sale_price: contract.sale_price_per_kg || 0,
      raw_data: {
        cost_to_warehouse: data?.avg_to_warehouse || 0,
        cost_to_export: data?.avg_to_export || 0,
        cost_to_import: data?.avg_to_import || 0,
        cost_to_client: data?.avg_to_client || 0
      }
    };

    return {
      metrics: formattedData,
      currentStage: stage,
      nextStage: getNextStage(stage),
      contractStatus: contract.status
    };
  }, [contractMetrics, contracts, selectedContractId]);

  const handleAdvance = async () => {
    if (!selectedContractId || !nextStage) return;
    setIsAdvancing(true);
    try {
      await advanceContractStage(selectedContractId, parseFloat(costInput) || 0);
      triggerRefresh();
      setCostInput('');
    } catch (e: any) {
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col">
                    <span className="text-[10px] uppercase font-black text-emerald-800 opacity-60">Status</span>
                    <span className="text-xs font-bold text-emerald-900 mt-1">{currentStage}</span>
                  </div>
                  <div className="bg-stone-100 p-4 rounded-2xl border border-stone-200 flex flex-col">
                    <span className="text-[10px] uppercase font-black text-stone-500 opacity-60">Contract ID</span>
                    <span className="text-xs font-mono font-bold text-stone-900 mt-1">
                      {contracts.find(c => c.id === selectedContractId)?.public_id || 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2 bg-stone-100 p-4 rounded-2xl border border-stone-200 flex flex-col">
                    <span className="text-[10px] uppercase font-black text-stone-500 opacity-60">Cost Aggregate</span>
                    <span className="text-xs font-bold text-stone-900 mt-1">
                      ${(metrics?.final_price || 0).toFixed(2)} / KG <span className="text-[10px] text-stone-400 font-normal">(Landed)</span>
                    </span>
                  </div>
                </div>

                {nextStage && contractStatus !== 'Fulfilled' && (
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

                {contractStatus === 'Fulfilled' && (
                  <div className="p-4 bg-emerald-950 rounded-2xl border border-emerald-500/30 text-center">
                    <span className="text-[10px] uppercase font-black text-emerald-400 tracking-widest">Supply Chain Optimized</span>
                    <p className="text-white text-xs font-bold mt-1">Contract Fulfilled & Logged</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ledger Footer */}
          <div className="bg-zinc-950 p-8 text-white">
            <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-2">Total Contract Value (Landed)</p>
            <div className="text-5xl font-mono font-bold text-emerald-400 tracking-tighter">
              ${(metrics?.total_contract_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-zinc-800 text-[10px] uppercase font-bold text-stone-500">
              <span>Per KG: ${(metrics?.final_price || 0).toFixed(2)}</span>
              <span>Margin vs Sale: ${((metrics?.sale_price || 0) * (metrics?.total_weight || 0) - (metrics?.total_contract_cost || 0)).toFixed(2)}</span>
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
