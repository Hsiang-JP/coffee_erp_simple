import React, { useState, useEffect } from 'react';
import { execute } from '../db/dbSetup';
import { useStore } from '../store/store';
import { useBuyLot } from '../hooks/useCoffeeData';
import SCAACuppingForm from '../components/SCAACuppingForm';

const DataEntry = () => {
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  const refreshTrigger = useStore((state) => state.refreshTrigger);
  const buyLot = useBuyLot();
  const [producers, setProducers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [lots, setLots] = useState([]);

  // Form States
  const [prodForm, setProdForm] = useState({ name: '', relationship: 'Direct Trade' });
  const [farmForm, setFarmForm] = useState({ name: '', producer_id: '', region: 'Cusco', altitude: 1800 });
  const [lotForm, setLotForm] = useState({ farm_id: '', variety: 'Caturra', process: 'Washed', weight: 690, cost: 8.50 });

  useEffect(() => {
    async function loadData() {
      const p = await execute("SELECT * FROM producers ORDER BY name");
      const f = await execute("SELECT * FROM farms ORDER BY name");
      const l = await execute("SELECT * FROM lots ORDER BY public_id DESC");
      setProducers(p);
      setFarms(f);
      setLots(l);
      
      if (p.length > 0 && !farmForm.producer_id) setFarmForm(prev => ({ ...prev, producer_id: p[0].id }));
      if (f.length > 0 && !lotForm.farm_id) setLotForm(prev => ({ ...prev, farm_id: f[0].id }));
    }
    loadData();
  }, [refreshTrigger]);

  const handleProdSubmit = async (e) => {
    e.preventDefault();
    const id = `prod-${Date.now()}`;
    await execute("INSERT INTO producers (id, name, relationship) VALUES (?, ?, ?)", [id, prodForm.name, prodForm.relationship]);
    alert("Producer added!");
    setProdForm({ name: '', relationship: 'Direct Trade' });
    triggerRefresh();
  };

  const handleFarmSubmit = async (e) => {
    e.preventDefault();
    const id = `farm-${Date.now()}`;
    await execute("INSERT INTO farms (id, name, producer_id, region, altitude_meters) VALUES (?, ?, ?, ?, ?)", 
        [id, farmForm.name, farmForm.producer_id, farmForm.region, farmForm.altitude]);
    alert("Farm added!");
    setFarmForm({ ...farmForm, name: '' });
    triggerRefresh();
  };

  const handleLotSubmit = async (e) => {
    e.preventDefault();
    try {
        const res = await buyLot({
            farm_id: lotForm.farm_id,
            variety: lotForm.variety,
            process_method: lotForm.process,
            total_weight_kg: parseFloat(lotForm.weight),
            base_farm_cost_per_kg: parseFloat(lotForm.cost)
        });
        alert(`SUCCESS: Received Lot ${res.lotPublicId}. Generated ${res.numBags} bags with unique stock codes.`);
    } catch (err) {
        alert(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-end border-b border-stone-200 pb-4">
            <div>
                <h1 className="text-3xl font-bold text-stone-900 tracking-tight uppercase italic">Warehouse Intake</h1>
                <p className="text-stone-500 font-mono text-xs">Official Data Entry Terminal</p>
            </div>
            
            <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200 shadow-inner">
                {['lot', 'qc', 'entities'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                            activeTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'
                        }`}
                    >
                        {tab === 'lot' ? 'Compra de Lote' : tab === 'qc' ? 'Catación' : 'Producers & Farms'}
                    </button>
                ))}
            </div>
        </div>

        {activeTab === 'lot' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-1 bg-emerald-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                        <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.3 14.55H3.7L12 5.45z"/></svg>
                    </div>
                    <h2 className="text-2xl font-black italic mb-4">Intake Protocol</h2>
                    <p className="text-emerald-200 text-sm leading-relaxed mb-6">
                        Entering a lot purchase triggers the system's **Auto-Bagging Algorithm**. 
                        Based on Peru's 69kg standard, the system will instantly generate individual 
                        traceable bags and assign warehouse positions.
                    </p>
                    <div className="space-y-4">
                        <div className="bg-emerald-800/50 p-4 rounded-xl border border-emerald-700/50">
                            <span className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">Last Lot ID</span>
                            <span className="text-xl font-mono font-bold">{lots[0]?.public_id || 'NONE'}</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleLotSubmit} className="lg:col-span-2 bg-white p-8 rounded-3xl border border-stone-200 shadow-xl space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-stone-500">Farm of Origin</label>
                            <select 
                                className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm focus:ring-emerald-500"
                                value={lotForm.farm_id}
                                onChange={(e) => setLotForm({...lotForm, farm_id: e.target.value})}
                            >
                                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-stone-500">Variety</label>
                            <select 
                                className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm focus:ring-emerald-500"
                                value={lotForm.variety}
                                onChange={(e) => setLotForm({...lotForm, variety: e.target.value})}
                            >
                                {['Typica', 'Caturra', 'Catuai', 'Geisha', 'Other'].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-stone-500">Process Method</label>
                            <select 
                                className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm focus:ring-emerald-500"
                                value={lotForm.process}
                                onChange={(e) => setLotForm({...lotForm, process: e.target.value})}
                            >
                                {['Washed', 'Natural', 'Honey', 'Anaerobic', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-stone-500">Total Weight (kg)</label>
                            <input 
                                type="number" step="0.1"
                                className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm focus:ring-emerald-500"
                                value={lotForm.weight}
                                onChange={(e) => setLotForm({...lotForm, weight: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-stone-500">Base Farm Cost ($/kg)</label>
                            <input 
                                type="number" step="0.01"
                                className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm focus:ring-emerald-500"
                                value={lotForm.cost}
                                onChange={(e) => setLotForm({...lotForm, cost: e.target.value})}
                            />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        className="w-full bg-stone-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-2xl transition-all active:scale-95"
                    >
                        Execute Intake Transaction
                    </button>
                </form>
            </div>
        )}

        {activeTab === 'qc' && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
                <SCAACuppingForm lots={lots} />
            </div>
        )}

        {activeTab === 'entities' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                {/* Producer Form */}
                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-lg space-y-6">
                    <h3 className="text-lg font-black uppercase italic text-stone-800 border-b border-stone-100 pb-2">Nuevo Productor</h3>
                    <form onSubmit={handleProdSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-stone-500">Legal Name</label>
                            <input 
                                type="text" required
                                className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm"
                                value={prodForm.name}
                                onChange={(e) => setProdForm({...prodForm, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-stone-500">Relationship</label>
                            <select 
                                className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm"
                                value={prodForm.relationship}
                                onChange={(e) => setProdForm({...prodForm, relationship: e.target.value})}
                            >
                                {['Important', 'Direct Trade', 'Co-op', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-stone-900 text-white font-bold uppercase text-xs py-3 rounded-xl">Register Producer</button>
                    </form>
                </div>

                {/* Farm Form */}
                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-lg space-y-6">
                    <h3 className="text-lg font-black uppercase italic text-stone-800 border-b border-stone-100 pb-2">Nueva Finca</h3>
                    <form onSubmit={handleFarmSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-stone-500">Assigned Producer</label>
                            <select 
                                className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm"
                                value={farmForm.producer_id}
                                onChange={(e) => setFarmForm({...farmForm, producer_id: e.target.value})}
                            >
                                {producers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-stone-500">Farm Name</label>
                            <input 
                                type="text" required
                                className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm"
                                value={farmForm.name}
                                onChange={(e) => setFarmForm({...farmForm, name: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-stone-500">Region</label>
                                <select 
                                    className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm"
                                    value={farmForm.region}
                                    onChange={(e) => setFarmForm({...farmForm, region: e.target.value})}
                                >
                                    {['Cusco', 'Cajamarca', 'Junin', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-stone-500">Altitude (masl)</label>
                                <input 
                                    type="number"
                                    className="w-full bg-stone-50 border-stone-200 rounded-xl p-3 text-sm"
                                    value={farmForm.altitude}
                                    onChange={(e) => setFarmForm({...farmForm, altitude: e.target.value})}
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-stone-900 text-white font-bold uppercase text-xs py-3 rounded-xl">Register Farm</button>
                    </form>
                </div>
            </div>
        )}

    </div>
  );
};

export default DataEntry;
