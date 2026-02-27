import React, { useState, useMemo } from 'react';
import { useStore } from '../store/store.js';
import { getNextStage } from '../db/dbSetup';
import { useAdvanceStage } from '../hooks/useCoffeeData';
import CoffeeMap from '../components/CoffeeMap.jsx';
import CostStepper from '../components/CostStepper.jsx';
import { useTranslation } from 'react-i18next';

const CoffeeJourney = () => {
  const { t } = useTranslation();
  const { coffees, contracts, lots, contractMetrics } = useStore();
  const [selectedContractId, setSelectedContractId] = useState('');
  const [costInput, setCostInput] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const advanceStage = useAdvanceStage();

  // 🚨 Helper to safely translate stages for the UI
  const getTranslatedStage = (stage) => {
    if (!stage) return '';
    const stageMap = {
      'Farm': t('map.stages.farm', 'Farm'),
      'Cora': 'Cora', 
      'Port-Export': t('map.stages.export', 'Port-Export'),
      'Port-Import': t('map.stages.import', 'Port-Import'),
      'Final Destination': t('map.stages.destination', 'Final Destination')
    };
    return stageMap[stage] || stage;
  };

  // 1. Simplified Logic: Use pre-calculated metrics from the store
  const { contractBags, metrics, currentStage, nextStage, varieties } = useMemo(() => {
    // Filter bags for this contract and attach variety from the lots table
    const bags = coffees
      .filter(b => b.contract_id === selectedContractId)
      .map(b => ({
        ...b,
        // 🚨 FIX: Translated "Unknown" fallback
        variety: lots.find(l => l.id === b.lot_id)?.variety || t('common.unknown', 'Unknown')
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
  }, [coffees, lots, selectedContractId, contractMetrics, t]);

  const handleAdvance = async () => {
    if (!selectedContractId || !nextStage) return;
    setIsAdvancing(true);
    try {
      await advanceStage(selectedContractId, parseFloat(costInput) || 0);
      setCostInput('');
    } catch (e) { 
      console.error("Advance Error:", e);
      alert(t('alerts.error.generic', { message: e.message })); 
    } finally { 
      setIsAdvancing(false); 
    }
  };

  // UI Expert Logic: Determine if the selected contract is already finished
  const isFulfilled = contracts.find(c => c.id === selectedContractId)?.status === 'Fulfilled';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-stone-50 min-h-screen p-6">
      {/* Sidebar: Control Panel */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-8 bg-zinc-950 text-white">
            <h2 className="text-2xl font-light tracking-tight">{t('journey.title')} <span className="font-bold">{t('journey.titleBold')}</span></h2>
            <p className="text-stone-500 text-[10px] uppercase tracking-widest mt-1">{t('journey.subtitle')}</p>
          </div>

          <div className="p-8 space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block ml-1">{t('journey.inventoryDeployment')}</label>
              <select 
                className={`w-full border-none rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  isFulfilled ? 'bg-stone-200 text-stone-500' : 'bg-stone-100 text-zinc-800'
                }`}
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
              >
                <option value="">{t('journey.selectContract')}</option>
                
                <optgroup label={t('journey.activeOperations')} className="text-[10px] font-black text-emerald-600 tracking-widest uppercase">
                  {contracts
                    .filter(c => c.status === 'Processing')
                    .map(c => (
                      <option key={c.id} value={c.id} className="bg-white text-zinc-900 font-bold p-2">
                        {c.public_id} — {c.client_name}
                      </option>
                    ))
                  }
                </optgroup>

                <optgroup label={t('journey.completedShipments')} className="text-[10px] font-black text-stone-400 tracking-widest uppercase">
                  {contracts
                    .filter(c => c.status === 'Fulfilled')
                    .map(c => (
                      <option 
                        key={c.id} 
                        value={c.id} 
                        className="bg-stone-100 text-stone-500 italic p-2"
                      >
                        {/* 🚨 FIX: Translated FULFILLED tag */}
                        {c.public_id} — {c.client_name} ({t('journey.fulfilledTag', 'FULFILLED')})
                      </option>
                    ))
                  }
                </optgroup>
              </select>
            </div>

            {selectedContractId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                {/* Status Card */}
                <div className={`flex justify-between items-center p-4 rounded-2xl border ${
                  isFulfilled ? 'bg-stone-100 border-stone-200' : 'bg-emerald-50 border-emerald-100'
                }`}>
                  <span className={`text-[10px] uppercase font-black tracking-widest ${isFulfilled ? 'text-stone-400' : 'text-emerald-800'}`}>{t('journey.status')}</span>
                  {/* 🚨 FIX: Translated Current Stage */}
                  <span className={`text-xs font-bold ${isFulfilled ? 'text-stone-500' : 'text-emerald-900'}`}>{getTranslatedStage(currentStage)}</span>
                </div>

                {/* Contract Details Section */}
                <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-4">
                  <div className="flex justify-between items-center border-b border-stone-200 pb-3">
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-widest">{t('journey.salePrice')}</span>
                    <span className="text-sm font-black text-zinc-900">
                      ${(contracts.find(c => c.id === selectedContractId)?.sale_price_per_kg || 0).toFixed(2)}
                      <span className="text-[10px] text-stone-400 font-medium ml-1">/KG</span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-stone-200 pb-3">
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-widest">{t('journey.totalWeight')}</span>
                    <span className="text-sm font-black text-zinc-900">
                      {metrics?.total_weight || 0}
                      <span className="text-[10px] text-stone-400 font-medium ml-1">KG</span>
                    </span>
                  </div>
                  
                  <div className="space-y-2 pt-1">
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-widest block">{t('journey.varieties')}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {varieties.map(v => (
                        <span key={v} className="bg-white px-2.5 py-1 rounded-lg text-[10px] font-bold text-zinc-600 border border-stone-200 shadow-sm">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Logistics Input - Hidden if Fulfilled */}
                {nextStage && !isFulfilled && (
                  <div className="space-y-3 pt-2">
                    {/* 🚨 FIX: Translated Next Stage in the label */}
                    <label className="text-[10px] uppercase font-black text-stone-400">{t('journey.addLogisticsCost')} ({getTranslatedStage(nextStage)})</label>
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
                      {/* 🚨 FIX: Translated Next Stage in the button */}
                      {isAdvancing ? t('common.processing', 'Processing...') : `${t('journey.moveTo')} ${getTranslatedStage(nextStage)}`}
                    </button>
                  </div>
                )}

                {/* Fulfilled Banner */}
                {isFulfilled && (
                  <div className="p-4 bg-stone-200 rounded-2xl border border-stone-300 flex items-center gap-3 animate-in fade-in zoom-in-95">
                    <span className="text-xl">🏁</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">{t('journey.historicalRecord')}</p>
                      <p className="text-xs text-stone-600 font-medium">{t('journey.contractFulfilled')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ledger Footer */}
          <div className="bg-zinc-950 p-8 text-white">
            <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-2">{t('journey.totalLandedValue')}</p>
            <div className="text-5xl font-mono font-bold text-emerald-400 tracking-tighter">
              ${(metrics?.total_landed || 0).toFixed(2)}
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-zinc-800 text-[10px] uppercase font-bold text-stone-500">
              <span>{t('journey.farmLedger')}: ${(metrics?.farm_cost || 0).toFixed(2)}</span>
              <span>{t('journey.ops')}: ${(metrics?.ops_cost || 0).toFixed(2)}</span>
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