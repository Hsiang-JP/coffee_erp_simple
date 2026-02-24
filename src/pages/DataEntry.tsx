import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { registerEntity, buyLotTransaction, logCostTransaction } from '../db/dbSetup';
import { useStore } from '../store/store';
// @ts-ignore
import SCAACuppingForm from '../components/SCAACuppingForm';
import { 
  Producer, 
  Farm, 
  Lot, 
  Client, 
  CostLedger, 
  RelationshipType, 
  RegionType, 
  LocationType, 
  CertificationType, 
  VarietyType, 
  ProcessMethodType, 
  ClientRelationshipType, 
  CostType 
} from '../types/database';

type TabType = 'lot' | 'qc' | 'logistics' | 'entities' | 'client';

interface ProdForm {
  name: string;
  relationship: RelationshipType;
}

interface FarmForm {
  name: string;
  producer_id: string;
  region: RegionType;
  altitude_meters: number;
  location: LocationType;
  certification: CertificationType;
}

interface LotForm {
  farm_id: string;
  variety: VarietyType;
  process_method: ProcessMethodType;
  weight: string | number;
  cost: string | number;
  harvest_date: string;
}

interface ClientForm {
  name: string;
  relationship: ClientRelationshipType;
  destination_country: string;
  destination_port: string;
  destination_city: string;
}

interface CostForm {
  lot_id: string;
  cost_type: CostType;
  amount_usd: string | number;
  date_incurred: string;
  notes: string;
}

const DataEntry: React.FC = () => {
  const producers = useStore((state) => state.producers);
  const farms = useStore((state) => state.farms);
  const lots = useStore((state) => state.lots);
  const ledger = useStore((state) => state.ledger);
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  
  const [activeTab, setActiveTab] = useState<TabType>('lot');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weightWarning, setWeightWarning] = useState('');

  // Form States
  const [prodForm, setProdForm] = useState<ProdForm>({ name: '', relationship: 'Direct Trade' });
  const [farmForm, setFarmForm] = useState<FarmForm>({ 
    name: '', 
    producer_id: '', 
    region: 'Cusco', 
    altitude_meters: 1800, 
    location: 'Santa Teresa', 
    certification: 'Organic' 
  });
  const [lotForm, setLotForm] = useState<LotForm>({ 
    farm_id: '', 
    variety: 'Caturra', 
    process_method: 'Washed', 
    weight: 690, 
    cost: 8.50, 
    harvest_date: new Date().toISOString().split('T')[0] 
  });
  const [clientForm, setClientForm] = useState<ClientForm>({ 
    name: '', 
    relationship: 'International', 
    destination_country: '', 
    destination_port: '', 
    destination_city: '' 
  });
  const [costForm, setCostForm] = useState<CostForm>({
    lot_id: '',
    cost_type: 'Milling',
    amount_usd: 0,
    date_incurred: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Handle default ID assignment when data loads
  useEffect(() => {
    if (producers.length > 0) {
        const currentExists = producers.find(p => p.id === farmForm.producer_id);
        if (!farmForm.producer_id || !currentExists) {
            setFarmForm(prev => ({ ...prev, producer_id: producers[0].id }));
        }
    }
  }, [producers, farmForm.producer_id]);

  useEffect(() => {
    if (farms.length > 0) {
        const currentExists = farms.find(f => f.id === lotForm.farm_id);
        if (!lotForm.farm_id || !currentExists) {
            setLotForm(prev => ({ ...prev, farm_id: farms[0].id }));
        }
    }
  }, [farms, lotForm.farm_id]);

  useEffect(() => {
    if (lots.length > 0 && !costForm.lot_id) {
        setCostForm(prev => ({ ...prev, lot_id: lots[0].id }));
    }
  }, [lots, costForm.lot_id]);

  // UX Protocol: Auto-Rounding for Weight
  const handleWeightBlur = () => {
    const rawValue = typeof lotForm.weight === 'string' ? parseFloat(lotForm.weight) : lotForm.weight;
    const value = rawValue || 0;
    if (value <= 0) {
        setLotForm(prev => ({ ...prev, weight: 69 }));
        return;
    }
    const roundedValue = Math.ceil(value / 69) * 69;
    if (roundedValue !== value) {
        setLotForm(prev => ({ ...prev, weight: roundedValue }));
        setWeightWarning(`⚠️ Adjusted to ${roundedValue}kg (Standard units)`);
        setTimeout(() => setWeightWarning(''), 5000);
    }
  };

  const handleProdSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        await registerEntity<Producer>('producers', prodForm);
        alert("SUCCESS: Producer registered.");
        setProdForm({ name: '', relationship: 'Direct Trade' });
        triggerRefresh();
    } catch (err: any) { alert(`ERROR: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleFarmSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!farmForm.producer_id) return alert("Select a Producer");
    setIsSubmitting(true);
    try {
        await registerEntity<Farm>('farms', farmForm);
        alert("SUCCESS: Farm registered.");
        setFarmForm(prev => ({ ...prev, name: '' }));
        triggerRefresh();
    } catch (err: any) { alert(`ERROR: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleClientSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        await registerEntity<Client>('clients', clientForm);
        alert("SUCCESS: Client registered.");
        setClientForm({ name: '', relationship: 'International', destination_country: '', destination_port: '', destination_city: '' });
        triggerRefresh();
    } catch (err: any) { alert(`ERROR: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleLotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!lotForm.farm_id) return alert("Select a Farm");
    
    setIsSubmitting(true);
    try {
        const res = await buyLotTransaction({
            farm_id: lotForm.farm_id,
            variety: lotForm.variety,
            process_method: lotForm.process_method,
            harvest_date: lotForm.harvest_date,
            total_weight_kg: typeof lotForm.weight === 'string' ? parseFloat(lotForm.weight) : lotForm.weight,
            base_farm_cost_per_kg: typeof lotForm.cost === 'string' ? parseFloat(lotForm.cost) : lotForm.cost
        });
        alert(`SUCCESS: Created Lot ${res.lotPublicId}. Generated ${res.numBags} traceable bags.`);
        setLotForm(prev => ({ ...prev, weight: 690, cost: 8.50 }));
        triggerRefresh();
    } catch (err: any) { alert(`ERROR: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleCostSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!costForm.lot_id) return alert("Select a Lot");
    
    setIsSubmitting(true);
    try {
        console.log("📝 [Transaction] Initiating Ledger Entry...");
        const res = await logCostTransaction({
            lot_id: costForm.lot_id,
            cost_type: costForm.cost_type,
            amount_usd: typeof costForm.amount_usd === 'string' ? parseFloat(costForm.amount_usd) : costForm.amount_usd,
            date_incurred: costForm.date_incurred,
            notes: costForm.notes
        });
        
        console.log("✅ [Transaction Committed]:", res.publicId);
        alert(`SUCCESS: Logged Cost ${res.publicId}`);
        
        setCostForm({ ...costForm, amount_usd: 0, notes: '' });
    } catch (err: any) { 
        console.error("❌ [Transaction Failed]:", err.message);
        alert(`DATABASE ERROR: ${err.message}`); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const selectedLotCosts = ledger.filter(c => c.lot_id === costForm.lot_id);
  const totalIncurred = selectedLotCosts.reduce((sum, c) => sum + (c.amount_usd || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
        
        <div className="flex justify-between items-end border-b border-stone-200 pb-6">
            <div>
                <h1 className="text-4xl font-light text-stone-900 tracking-tight uppercase italic">
                    Intake <span className="font-black">Terminal</span>
                </h1>
                <p className="text-stone-400 font-mono text-[10px] uppercase tracking-[0.2em] mt-1 text-emerald-600 font-bold">Traceability Protocol Active</p>
            </div>
            
            <div className="flex bg-stone-100 p-1.5 rounded-2xl border border-stone-200 shadow-inner">
                {(['lot', 'qc', 'logistics', 'entities', 'client'] as TabType[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab ? 'bg-white text-emerald-700 shadow-lg' : 'text-stone-400 hover:text-stone-600'
                        }`}
                    >
                        {tab === 'lot' ? 'Compra Lote' : tab === 'qc' ? 'Laboratorio' : tab === 'logistics' ? 'Costos' : tab === 'entities' ? 'Productores' : 'Clientes'}
                    </button>
                ))}
            </div>
        </div>

        {activeTab === 'lot' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-4 bg-zinc-950 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
                        <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.3 14.55H3.7L12 5.45z"/></svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black italic mb-6 leading-tight">Intake Protocol</h2>
                        <p className="text-stone-400 text-sm leading-relaxed mb-8 font-light">
                            Authorized personnel only. Entering a lot purchase triggers the system's **Traceable Bagging Algorithm**. 
                            Unique identifiers are generated based on Farm, Variety, and Harvest cycles.
                        </p>
                    </div>
                    <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                        <span className="block text-[9px] uppercase font-black text-emerald-500 mb-1 tracking-[0.2em]">System Status</span>
                        <span className="text-xs font-mono">Ready for Transaction</span>
                    </div>
                </div>

                <form onSubmit={handleLotSubmit} className="lg:col-span-8 bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-xl space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Farm of Origin</label>
                            <select 
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={lotForm.farm_id}
                                onChange={(e) => setLotForm({...lotForm, farm_id: e.target.value})}
                            >
                                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Harvest Date</label>
                            <input 
                                type="date"
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={lotForm.harvest_date}
                                onChange={(e) => setLotForm({...lotForm, harvest_date: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Variety</label>
                            <select 
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={lotForm.variety}
                                onChange={(e) => setLotForm({...lotForm, variety: e.target.value as VarietyType})}
                            >
                                {(['Typica', 'Caturra', 'Catuai', 'Geisha', 'Other'] as VarietyType[]).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Process Method</label>
                            <select 
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={lotForm.process_method}
                                onChange={(e) => setLotForm({...lotForm, process_method: e.target.value as ProcessMethodType})}
                            >
                                {(['Washed', 'Natural', 'Honey', 'Anaerobic', 'Other'] as ProcessMethodType[]).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Total Weight (kg)</label>
                                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                                    Equates to {Math.ceil((parseFloat(String(lotForm.weight)) || 69) / 69)} full bags
                                </span>
                            </div>
                            <input 
                                type="number" step="0.1"
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={lotForm.weight}
                                onChange={(e) => setLotForm({...lotForm, weight: e.target.value})}
                                onBlur={handleWeightBlur}
                            />
                            {weightWarning && <p className="text-[9px] font-black text-amber-600 animate-pulse">{weightWarning}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Base Cost ($/kg)</label>
                            <input 
                                type="number" step="0.01"
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={lotForm.cost}
                                onChange={(e) => setLotForm({...lotForm, cost: e.target.value})}
                            />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full bg-zinc-900 text-white font-black uppercase tracking-[0.3em] py-5 rounded-2xl shadow-2xl transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black active:scale-95'}`}
                    >
                        {isSubmitting ? 'VERIFYING...' : 'AUTHORIZE INTAKE'}
                    </button>
                </form>
            </div>
        )}

        {activeTab === 'qc' && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
                <SCAACuppingForm lots={lots} />
            </div>
        )}

        {activeTab === 'logistics' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="lg:col-span-4 bg-stone-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div>
                        <h2 className="text-3xl font-black italic mb-6 leading-tight uppercase">Ledger <span className="text-emerald-500">Entry</span></h2>
                        <p className="text-stone-400 text-sm leading-relaxed mb-8 font-light">
                            Processing and logistics expenses are dynamically aggregated to calculate the final **Landed Cost** of the inventory.
                        </p>
                    </div>
                    
                    <div className="bg-stone-800/50 p-6 rounded-3xl border border-stone-700 backdrop-blur-sm">
                        <label className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-2 block">Lot Summary</label>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-xs font-mono text-stone-400">Total Incurred</div>
                                <div className="text-3xl font-black text-white">${totalIncurred.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-mono text-stone-400">Entries</div>
                                <div className="text-lg font-black text-emerald-400">{selectedLotCosts.length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleCostSubmit} className="lg:col-span-8 bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-xl space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Target Lot</label>
                            <select 
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={costForm.lot_id}
                                onChange={(e) => setCostForm({...costForm, lot_id: e.target.value})}
                            >
                                {lots.map(l => <option key={l.id} value={l.id}>{l.public_id} - {l.variety}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Cost Category</label>
                            <select 
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={costForm.cost_type}
                                onChange={(e) => setCostForm({...costForm, cost_type: e.target.value as CostType})}
                            >
                                {(['Milling', 'Drying', 'Sorting', 'Lab/Grading', 'Packaging', 'Transportation', 'Other'] as CostType[]).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Amount (USD)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                                <input 
                                    type="number" step="0.01"
                                    className="w-full bg-stone-50 border-none rounded-2xl p-4 pl-8 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                    value={costForm.amount_usd}
                                    onChange={(e) => setCostForm({...costForm, amount_usd: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Date Incurred</label>
                            <input 
                                type="date"
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={costForm.date_incurred}
                                onChange={(e) => setCostForm({...costForm, date_incurred: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Transaction Notes</label>
                        <textarea 
                            className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all h-24"
                            placeholder="Add specific details about this expense..."
                            value={costForm.notes}
                            onChange={(e) => setCostForm({...costForm, notes: e.target.value})}
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full bg-zinc-900 text-white font-black uppercase tracking-[0.3em] py-5 rounded-2xl shadow-2xl transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black active:scale-95'}`}
                    >
                        {isSubmitting ? 'Recording Expense...' : 'Authorize Ledger Entry'}
                    </button>
                </form>
            </div>
        )}

        {activeTab === 'entities' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-500">
                <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-xl space-y-8">
                    <h3 className="text-xl font-black uppercase italic text-zinc-900 border-b border-stone-50 pb-4 tracking-tighter">Nuevo Productor</h3>
                    <form onSubmit={handleProdSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Legal Name</label>
                            <input 
                                type="text" required
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={prodForm.name}
                                onChange={(e) => setProdForm({...prodForm, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Relationship</label>
                            <select 
                                className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={prodForm.relationship}
                                onChange={(e) => setProdForm({...prodForm, relationship: e.target.value as RelationshipType})}
                            >
                                {(['Important', 'Direct Trade', 'Co-op', 'Other'] as RelationshipType[]).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={isSubmitting} className={`w-full bg-zinc-900 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-lg ${isSubmitting ? 'opacity-50' : 'hover:bg-black'}`}>
                            {isSubmitting ? 'SAVING...' : 'REGISTER PRODUCER'}
                        </button>
                    </form>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-xl space-y-8">
                    <h3 className="text-xl font-black uppercase italic text-zinc-900 border-b border-stone-50 pb-4 tracking-tighter">Nueva Finca</h3>
                    <form onSubmit={handleFarmSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Producer</label>
                                <select 
                                    className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold"
                                    value={farmForm.producer_id}
                                    onChange={(e) => setFarmForm({...farmForm, producer_id: e.target.value})}
                                >
                                    {producers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Farm Name</label>
                                <input 
                                    type="text" required
                                    className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold"
                                    value={farmForm.name}
                                    onChange={(e) => setFarmForm({...farmForm, name: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Location</label>
                                <select 
                                    className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold"
                                    value={farmForm.location}
                                    onChange={(e) => setFarmForm({...farmForm, location: e.target.value as LocationType})}
                                >
                                    {(['Quillabamba', 'Santa Teresa', 'Quellouno', 'Other'] as LocationType[]).map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Certification</label>
                                <select 
                                    className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold"
                                    value={farmForm.certification}
                                    onChange={(e) => setFarmForm({...farmForm, certification: e.target.value as CertificationType})}
                                >
                                    {(['Organic', 'Fair Trade', 'Rainforest Alliance', 'None'] as CertificationType[]).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <button type="submit" disabled={isSubmitting} className={`w-full bg-zinc-900 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-lg ${isSubmitting ? 'opacity-50' : 'hover:bg-black'}`}>
                            {isSubmitting ? 'SAVING...' : 'REGISTER FARM'}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {activeTab === 'client' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <form onSubmit={handleClientSubmit} className="max-w-4xl mx-auto bg-white p-12 rounded-[3rem] border border-stone-100 shadow-2xl space-y-10">
                    <div className="text-center mb-10">
                        <h3 className="text-3xl font-black uppercase tracking-tighter italic">Global Client Registry</h3>
                        <p className="text-stone-400 text-xs font-mono mt-2 tracking-widest">ESTABLISHING TRADE PARTNERSHIPS</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 border-b border-stone-50 pb-2">Business Profile</h4>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-stone-400">Legal Business Name</label>
                                    <input 
                                        type="text" required
                                        className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                                        value={clientForm.name}
                                        onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-stone-400">Relationship Grade</label>
                                    <select 
                                        className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                                        value={clientForm.relationship}
                                        onChange={(e) => setClientForm({...clientForm, relationship: e.target.value as ClientRelationshipType})}
                                    >
                                        {(['VIP', 'International', 'National', 'Other'] as ClientRelationshipType[]).map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 border-b border-stone-50 pb-2">Logistics Routing</h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-stone-400">Destination Country</label>
                                    <input 
                                        type="text" placeholder="e.g. Japan"
                                        className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold"
                                        value={clientForm.destination_country}
                                        onChange={(e) => setClientForm({...clientForm, destination_country: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-stone-400">Port</label>
                                        <input 
                                            type="text" placeholder="Yokohama"
                                            className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold"
                                            value={clientForm.destination_port}
                                            onChange={(e) => setClientForm({...clientForm, destination_port: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-stone-400">City</label>
                                        <input 
                                            type="text" placeholder="Tokyo"
                                            className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold"
                                            value={clientForm.destination_city}
                                            onChange={(e) => setClientForm({...clientForm, destination_city: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-full bg-emerald-600 text-white font-black uppercase tracking-[0.4em] py-6 rounded-[2rem] transition-all shadow-2xl ${isSubmitting ? 'opacity-50' : 'hover:bg-emerald-700 active:scale-[0.98]'}`}
                    >
                        {isSubmitting ? 'ESTABLISHING...' : 'AUTHORIZE CLIENT ENTRY'}
                    </button>
                </form>
            </div>
        )}

    </div>
  );
};

export default DataEntry;
