import React, { useState, useMemo } from 'react';
import { useStore } from '../store/store';
import { useBuyLot } from '../hooks/useCoffeeData';
import SCAACuppingForm from '../components/SCAACuppingForm';
import { createProducer } from '../db/services/producerService';
import { createFarm } from '../db/services/farmService';
import { createClient, createCostLedgerEntry } from '../db/services/inventoryService';

// --- Reusable Combobox Component ---
const Combobox = ({ options, value, onChange, onAdd, label, placeholder }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.find(opt => 
    opt.name.toLowerCase() === search.toLowerCase()
  );

  return (
    <div className="relative">
      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">{label}</label>
      <input 
        type="text"
        placeholder={placeholder}
        value={isOpen ? search : (options.find(o => o.id === value)?.name || search || value)}
        onFocus={() => { setIsOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-stone-100 rounded-2xl shadow-xl z-50 max-h-40 overflow-y-auto p-2">
          {filtered.map(opt => (
            <div 
              key={opt.id}
              className="p-3 hover:bg-emerald-50 rounded-xl cursor-pointer text-sm font-medium transition-colors"
              onClick={() => { onChange(opt.id); setIsOpen(false); setSearch(opt.name); }}
            >
              {opt.name}
            </div>
          ))}

          {!exactMatch && search.length > 0 && (
            <div 
              className="p-3 mt-1 bg-emerald-50 text-emerald-700 rounded-xl cursor-pointer text-sm font-black uppercase tracking-wider border border-emerald-100"
              onClick={() => { onAdd(search); setIsOpen(false); }}
            >
              + Add "{search}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Form Components ---

const NewProducerForm = () => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Other');
  const { triggerRefresh, fetchAll } = useStore(); // Destructure both for full sync

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. SCHEMA VALIDATION: Check NOT NULL field
    if (!name.trim()) {
      alert("Producer Name is required.");
      return;
    }

    try {
      // 2. Persistent Save to SQLite
      await createProducer({ 
        name: name.trim(), 
        relationship 
      });

      alert(`Successful: Producer "${name}" registered.`);
      
      // 3. Reset Form
      setName('');
      setRelationship('Other');

      // 4. Global Sync: Ensure other forms see this new producer immediately
      await fetchAll();
      triggerRefresh();
    } catch (err) {
      alert("Registration Error: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-stone-100 max-w-2xl space-y-6">
      <div className="border-b border-stone-100 pb-4">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900">New Producer</h3>
        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Supply Chain Entity Registration</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Legal Name *</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="e.g. Alejandro Vargas"
            className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500" 
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Relationship Type *</label>
          <select 
            value={relationship} 
            onChange={(e) => setRelationship(e.target.value)} 
            className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {/* Matches CHECK(relationship IN ('Important', 'Direct Trade', 'Co-op', 'Other')) */}
            <option value="Important">Important</option>
            <option value="Direct Trade">Direct Trade</option>
            <option value="Co-op">Co-op</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <button 
        type="submit" 
        className="w-full bg-zinc-900 text-white p-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] hover:bg-black transition-all shadow-xl shadow-stone-200"
      >
        Authorize & Register Producer
      </button>
    </form>
  );
};

const NewFarmForm = () => {
  const { producers, farms, triggerRefresh, fetchAll } = useStore();
  const [producerId, setProducerId] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [altitude, setAltitude] = useState('');
  const [location, setLocation] = useState('');
  const [certification, setCertification] = useState('None');

  const regionOptions = useMemo(() => {
    const defaults = ['Cusco', 'Cajamarca', 'Junin'];
    const current = farms.map(f => f.region);
    return [...new Set([...defaults, ...current])].filter(Boolean).map(r => ({ id: r, name: r }));
  }, [farms]);

  const locationOptions = useMemo(() => {
    const defaults = ['Quillabamba', 'Santa Teresa', 'Quellouno'];
    const current = farms.map(f => f.location);
    return [...new Set([...defaults, ...current])].filter(Boolean).map(l => ({ id: l, name: l }));
  }, [farms]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!producerId || !name.trim() || !region || !location) {
      return alert("Missing Fields: Producer, Farm Name, Region, and Location are required.");
    }
    await createFarm({ producerId, name, region, altitude: parseFloat(altitude) || 0, location, certification });
    alert("Successful: Farm registered.");
    setName(''); setAltitude('');
    await fetchAll();
    triggerRefresh();
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-stone-100 max-w-2xl space-y-6">
      <h3 className="text-2xl font-black italic uppercase tracking-tighter">Farm Registration</h3>
      <div className="grid grid-cols-1 gap-6">
        <select value={producerId} onChange={(e) => setProducerId(e.target.value)} className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold">
          <option value="">Select Producer *</option>
          {producers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="Farm Name *" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold" />
          <input type="number" placeholder="Altitude (m)" value={altitude} onChange={(e) => setAltitude(e.target.value)} className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Combobox label="Region *" options={regionOptions} value={region} onChange={setRegion} onAdd={setRegion} />
          <Combobox label="Location *" options={locationOptions} value={location} onChange={setLocation} onAdd={setLocation} />
        </div>
      </div>
      <button type="submit" className="w-full bg-zinc-900 text-white p-5 rounded-2xl font-black uppercase">Add Farm</button>
    </form>
  );
};

const BuyCoffeeForm = () => {
  const { farms, lots, fetchAll, triggerRefresh } = useStore();
  const [farmId, setFarmId] = useState('');
  const [variety, setVariety] = useState('');
  const [processMethod, setProcessMethod] = useState('');
  const [inputWeight, setInputWeight] = useState(''); 
  const [baseCost, setBaseCost] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const buyLot = useBuyLot();

  const BAG_SIZE = 69.0;

  // --- Dynamic Searchable Options ---
  const varietyOptions = useMemo(() => {
    const defaults = ['Typica', 'Caturra', 'Geisha', 'Bourbon', 'Catimor'];
    const current = lots.map(l => l.variety);
    return [...new Set([...defaults, ...current])].filter(Boolean).map(v => ({ id: v, name: v }));
  }, [lots]);

  const processOptions = useMemo(() => {
    const defaults = ['Washed', 'Natural', 'Honey', 'Anaerobic'];
    const current = lots.map(l => l.process_method);
    return [...new Set([...defaults, ...current])].filter(Boolean).map(p => ({ id: p, name: p }));
  }, [lots]);

  // --- Inventory Calibration Math ---
  const roundedWeight = useMemo(() => {
    const val = parseFloat(inputWeight);
    if (isNaN(val) || val <= 0) return 0;
    return Math.ceil(val / BAG_SIZE) * BAG_SIZE;
  }, [inputWeight]);

  const needsRounding = parseFloat(inputWeight) > 0 && parseFloat(inputWeight) !== roundedWeight;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // SCHEMA CHECK: variety, process_method, total_weight_kg, base_farm_cost_per_kg NOT NULL
    if (!farmId || !variety || !processMethod || roundedWeight <= 0 || !baseCost) {
      return alert("Missing Data: All required fields (*) must be filled.");
    }
    
    try {
      await buyLot({
        farm_id: farmId,
        variety,
        process_method: processMethod,
        total_weight_kg: roundedWeight,
        base_farm_cost_per_kg: parseFloat(baseCost),
        harvest_date: harvestDate
      });

      alert(`Successful: ${roundedWeight}kg of ${variety} registered.`);
      
      // Reset Form
      setFarmId(''); setVariety(''); setProcessMethod(''); 
      setInputWeight(''); setBaseCost('');
      
      await fetchAll();
      triggerRefresh();
    } catch (err) {
      alert("Intake Error: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-white rounded-[2.5rem] space-y-8 shadow-sm border border-stone-100 max-w-2xl">
      <div className="border-b border-stone-100 pb-4">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900">Inventory Intake</h3>
        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Standard 69kg Bag Calibration</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Source Farm Selection */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Source Farm *</label>
          <select 
            value={farmId} 
            onChange={(e) => setFarmId(e.target.value)} 
            className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select Farm</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {/* Dynamic Variety & Process Combos */}
        <div className="grid grid-cols-2 gap-4">
          <Combobox 
            label="Variety *" 
            placeholder="e.g. Caturra"
            options={varietyOptions} 
            value={variety} 
            onChange={setVariety} 
            onAdd={setVariety} 
          />
          <Combobox 
            label="Process *" 
            placeholder="e.g. Washed"
            options={processOptions} 
            value={processMethod} 
            onChange={setProcessMethod} 
            onAdd={setProcessMethod} 
          />
        </div>

        {/* Weight & Harvest Date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Approx Weight (kg) *</label>
            <input 
              type="number" step="0.01" value={inputWeight} 
              onChange={(e) => setInputWeight(e.target.value)} 
              className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold" 
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Harvest Date</label>
            <input 
              type="date" value={harvestDate} 
              onChange={(e) => setHarvestDate(e.target.value)} 
              className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold" 
            />
          </div>
        </div>

        {/* Calibration Warning */}
        {needsRounding && (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-xl">⚖️</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Calibration Warning</p>
              <p className="text-xs text-amber-700 font-medium">
                Rounding to <span className="font-black">{roundedWeight}kg</span> ({Math.ceil(roundedWeight/69)} bags).
              </p>
            </div>
          </div>
        )}

        {/* Cost per KG */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Base Farm Cost ($/kg) *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
            <input 
              type="number" step="0.01" value={baseCost} 
              onChange={(e) => setBaseCost(e.target.value)} 
              className="w-full bg-stone-50 border-none rounded-xl p-4 pl-8 text-sm font-bold" 
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <button type="submit" className="w-full bg-zinc-900 text-white p-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.5em] hover:bg-black transition-all shadow-xl shadow-stone-200">
        Authorize Purchase & Generate Bags
      </button>
    </form>
  );
};

const CostLedgerForm = () => {
  const { lots, farms, triggerRefresh, fetchAll } = useStore();
  
  // State matching the schema
  const [lotId, setLotId] = useState('');
  const [costType, setCostType] = useState('Transportation'); // Matches CHECK constraint
  const [amountUsd, setAmountUsd] = useState('');
  const [dateIncurred, setDateIncurred] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // 1. IMPROVED: Formatted Lot Labels for easier selection
  const lotOptions = useMemo(() => {
    return lots.map(lot => {
      const farm = farms.find(f => f.id === lot.farm_id);
      return {
        id: lot.id,
        label: `${lot.public_id} - ${farm?.name || 'Unknown Farm'} (${lot.variety})`
      };
    });
  }, [lots, farms]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 2. SCHEMA VALIDATION: Check NOT NULL fields
    if (!lotId) return alert("Please select a Coffee Lot.");
    if (!amountUsd || parseFloat(amountUsd) <= 0) {
      return alert("Please enter a valid Amount in USD.");
    }

    try {
      // 3. Persistent Save to SQLite
      await createCostLedgerEntry({ 
        lotId, 
        costType, 
        amountUsd: parseFloat(amountUsd), 
        dateIncurred,
        notes: notes.trim()
      });

      alert(`Successful: ${costType} cost registered.`);
      
      // Reset Form
      setLotId('');
      setAmountUsd('');
      setNotes('');
      
      // 4. Global Hydration
      await fetchAll();
      triggerRefresh();
    } catch (err) {
      alert("Ledger Error: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-stone-100 max-w-2xl space-y-6">
      <div className="border-b border-stone-100 pb-4">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900">Operations Ledger</h3>
        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Post-Harvest Cost Attribution</p>
      </div>

      <div className="space-y-6">
        {/* Lot Selection with Farm Context */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Target Coffee Lot *</label>
          <select 
            value={lotId} 
            onChange={(e) => setLotId(e.target.value)}
            className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select Lot</option>
            {lotOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Cost Type matching CHECK(cost_type IN (...)) */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Cost Category *</label>
            <select 
              value={costType} 
              onChange={(e) => setCostType(e.target.value)}
              className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800"
            >
              <option value="Transportation">Transportation</option>
              <option value="Milling">Milling</option>
              <option value="Drying">Drying</option>
              <option value="Sorting">Sorting</option>
              <option value="Lab/Grading">Lab/Grading</option>
              <option value="Packaging">Packaging</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Amount (USD) *</label>
            <div className="relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
               <input 
                 type="number" step="0.01" value={amountUsd} 
                 onChange={(e) => setAmountUsd(e.target.value)}
                 className="w-full bg-stone-50 border-none rounded-xl p-4 pl-8 text-sm font-bold"
                 placeholder="0.00"
               />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Notes / Description</label>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Trucking from Quillabamba to Cusco warehouse"
            className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-medium h-24"
          />
        </div>
      </div>

      <button type="submit" className="w-full bg-zinc-900 text-white p-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] hover:bg-black transition-all shadow-xl">
        Authorize Expense & Update Lot Value
      </button>
    </form>
  );
};

const ClientForm = () => {
  const { clients, triggerRefresh, fetchAll } = useStore();
  
  // Form State
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Other'); // Default matches CHECK constraint
  const [country, setCountry] = useState('');
  const [port, setPort] = useState('');
  const [city, setCity] = useState('');

  // 1. Dynamic Lookups: Extracting existing logistics data from the SQLite engine
  const countryOptions = useMemo(() => {
    const defaults = ['USA', 'Japan', 'Germany', 'Norway', 'South Korea'];
    const current = (clients || []).map(c => c.destination_country);
    return [...new Set([...defaults, ...current])].filter(Boolean).map(val => ({ id: val, name: val }));
  }, [clients]);

  const portOptions = useMemo(() => {
    const defaults = ['Seattle', 'Yokohama', 'Hamburg', 'Oslo', 'Busan'];
    const current = (clients || []).map(c => c.destination_port);
    return [...new Set([...defaults, ...current])].filter(Boolean).map(val => ({ id: val, name: val }));
  }, [clients]);

  const cityOptions = useMemo(() => {
    const defaults = ['Portland', 'Tokyo', 'Berlin', 'Bergen', 'Seoul'];
    const current = (clients || []).map(c => c.destination_city);
    return [...new Set([...defaults, ...current])].filter(Boolean).map(val => ({ id: val, name: val }));
  }, [clients]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 2. SCHEMA VALIDATION: name and destination_city are NOT NULL
    if (!name.trim()) return alert("Client Name is required.");
    if (!city.trim()) return alert("Destination City is required.");

    try {
      await createClient({ 
        name: name.trim(), 
        relationship, 
        country, 
        port, 
        city: city.trim() 
      });

      alert(`Successful: Client "${name}" registered.`);
      
      // 3. Reset Form
      setName(''); setRelationship('Other'); setCountry(''); setPort(''); setCity('');
      
      // 4. Sync Global Store
      await fetchAll();
      triggerRefresh();
    } catch (err) {
      alert("Registration Error: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-stone-100 max-w-2xl space-y-6">
      <div className="border-b border-stone-100 pb-4">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900">Client Onboarding</h3>
        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Global Distribution Records</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Legal Name *</label>
            <input 
              type="text" value={name} onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Blue Bottle"
              className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500" 
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Relationship *</label>
            <select 
              value={relationship} onChange={(e) => setRelationship(e.target.value)}
              className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800"
            >
              {/* Matches CHECK(relationship IN ('VIP', 'International', 'National', 'Other')) */}
              <option value="VIP">VIP</option>
              <option value="International">International</option>
              <option value="National">National</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Searchable Logistics Combos */}
        <div className="grid grid-cols-3 gap-4">
          <Combobox 
            label="Country" placeholder="Search..."
            options={countryOptions} value={country} 
            onChange={setCountry} onAdd={setCountry} 
          />
          <Combobox 
            label="Port" placeholder="Search..."
            options={portOptions} value={port} 
            onChange={setPort} onAdd={setPort} 
          />
          <Combobox 
            label="City *" placeholder="Search..."
            options={cityOptions} value={city} 
            onChange={setCity} onAdd={setCity} 
          />
        </div>
      </div>

      <button 
        type="submit" 
        className="w-full bg-zinc-900 text-white p-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.5em] hover:bg-black transition-all shadow-xl"
      >
        Authorize & Register Client
      </button>
    </form>
  );
};

const DataEntry = () => {
  const [activeTab, setActiveTab] = useState('producer');
  const renderForm = () => {
    switch (activeTab) {
      case 'producer': return <NewProducerForm />;
      case 'farm': return <NewFarmForm />;
      case 'buyCoffee': return <BuyCoffeeForm />;
      case 'costLedger': return <CostLedgerForm />; // ✅ This will now resolve correctly
      case 'cupping': return <SCAACuppingForm />; 
      case 'client': return <ClientForm />;
      default: return <NewProducerForm />;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Data Entry & Warehouse Intake</h2>
      <div className="bg-white shadow rounded-lg flex">
        <div className="w-1/4 border-r border-gray-200 p-4 space-y-2">
          {['producer', 'farm', 'buyCoffee', 'costLedger', 'cupping', 'client'].map(tab => (
            <TabButton key={tab} name={tab} activeTab={activeTab} setActiveTab={setActiveTab}>
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1')}
            </TabButton>
          ))}
        </div>
        <div className="w-3/4 p-4">{renderForm()}</div>
      </div>
    </div>
  );
};

const TabButton = ({ name, activeTab, setActiveTab, children }) => {
  const isActive = name === activeTab;
  return (
    <button onClick={() => setActiveTab(name)} className={`block w-full text-left px-4 py-2 rounded-md transition-colors ${isActive ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>{children}</button>
  );
};

export default DataEntry;