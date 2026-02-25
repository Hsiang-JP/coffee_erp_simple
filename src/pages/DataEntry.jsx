import React, { useState, useMemo } from 'react';
import { useStore } from '../store/store';
import { useBuyLot } from '../hooks/useCoffeeData';
import SCAACuppingForm from '../components/SCAACuppingForm';
import { createProducer } from '../db/services/producerService';
import { createFarm } from '../db/services/farmService';
import { createClient, createCostLedgerEntry } from '../db/services/inventoryService';

// --- Form Components ---
const NewProducerForm = () => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Other');
  const triggerRefresh = useStore((state) => state.triggerRefresh);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    await createProducer({ name, relationship });
    alert("Successful: Producer registered.");
    setName('');
    setRelationship('Other');
    triggerRefresh();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">New Producer</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Relationship</label>
        <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          <option value="Important">Important</option>
          <option value="Direct Trade">Direct Trade</option>
          <option value="Co-op">Co-op</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md">Add Producer</button>
    </form>
  );
};

const Combobox = ({ options, value, onChange, onAdd, label, placeholder }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Filter existing options by search text
  const filtered = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  // Check if what the user typed already exists
  const exactMatch = options.find(opt => 
    opt.name.toLowerCase() === search.toLowerCase()
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input 
        type="text"
        placeholder={placeholder}
        // Show the name of the selected ID, or the current search text if typing
        value={isOpen ? search : (options.find(o => o.id === value)?.name || search || value)}
        onFocus={() => { setIsOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
          {filtered.map(opt => (
            <div 
              key={opt.id}
              className="p-2 hover:bg-emerald-50 cursor-pointer text-sm"
              onClick={() => { onChange(opt.id); setIsOpen(false); setSearch(opt.name); }}
            >
              {opt.name}
            </div>
          ))}

          {!exactMatch && search.length > 0 && (
            <div 
              className="p-2 bg-emerald-50 text-emerald-700 cursor-pointer text-sm font-bold border-t border-emerald-100"
              onClick={() => { onAdd(search); setIsOpen(false); }}
            >
              + Add "{search}" as a new Region
            </div>
          )}
        </div>
      )}
    </div>
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

  // 1. Dynamic Lookups: Extract unique existing data for the Comboboxes
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
    if (!producerId || !name || !region || !location) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      await createFarm({ 
        producerId, 
        name, 
        region, 
        altitude: parseFloat(altitude) || 0, 
        location, 
        certification 
      });
      
      alert(`Successful: ${name} registered.`);
      
      // Reset Form
      setProducerId('');
      setName('');
      setRegion('');
      setAltitude('');
      setLocation('');
      setCertification('None');
      
      // 2. Sync global store and trigger re-render
      await fetchAll(); 
      triggerRefresh();
    } catch (err) {
      alert("Failed to register farm: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-stone-100 max-w-2xl space-y-6">
      <div className="border-b border-stone-100 pb-4">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900">Farm Registration</h3>
        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Origin Traceability Module</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Producer Selection */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Owner / Producer</label>
          <select 
            value={producerId} 
            onChange={(e) => setProducerId(e.target.value)} 
            className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800"
          >
            <option value="">Select Producer</option>
            {producers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Name & Altitude */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Farm Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Altitude (MASL)</label>
            <input type="number" value={altitude} onChange={(e) => setAltitude(e.target.value)} className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold" />
          </div>
        </div>

        {/* Searchable Region & Location */}
        <div className="grid grid-cols-2 gap-4">
          <Combobox 
            label="Region"
            placeholder="Search or add region..."
            options={regionOptions}
            value={region}
            onChange={setRegion}
            onAdd={setRegion}
          />
          <Combobox 
            label="Location / Town"
            placeholder="Search or add town..."
            options={locationOptions}
            value={location}
            onChange={setLocation}
            onAdd={setLocation}
          />
        </div>

        {/* Strict Certification Selection */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Certification</label>
          <select 
            value={certification} 
            onChange={(e) => setCertification(e.target.value)} 
            className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold"
          >
            <option value="None">None</option>
            <option value="Organic">Organic</option>
            <option value="Fair Trade">Fair Trade</option>
            <option value="Rainforest Alliance">Rainforest Alliance</option>
          </select>
        </div>
      </div>

      <button type="submit" className="w-full bg-zinc-900 text-white p-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] hover:bg-black transition-all shadow-xl shadow-stone-200">
        Register Farm to Database
      </button>
    </form>
  );
};

const BuyCoffeeForm = () => {
  const { farms } = useStore();
  const [farmId, setFarmId] = useState('');
  const [variety, setVariety] = useState('Other');
  const [processMethod, setProcessMethod] = useState('Other');
  const [inputWeight, setInputWeight] = useState(''); 
  const [baseCost, setBaseCost] = useState('');
  const buyLot = useBuyLot();

  const BAG_SIZE = 69.0;
  
  const roundedWeight = useMemo(() => {
    const val = parseFloat(inputWeight);
    if (isNaN(val) || val <= 0) return 0;
    return Math.ceil(val / BAG_SIZE) * BAG_SIZE;
  }, [inputWeight]);

  const needsRounding = parseFloat(inputWeight) > 0 && parseFloat(inputWeight) !== roundedWeight;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!farmId || roundedWeight <= 0 || !baseCost) return;
    
    try {
      await buyLot({
        farm_id: farmId,
        variety,
        process_method: processMethod,
        total_weight_kg: roundedWeight,
        base_farm_cost_per_kg: parseFloat(baseCost),
      });
      alert("Successful: Lot intake complete.");
      setFarmId('');
      setVariety('Other');
      setProcessMethod('Other');
      setInputWeight('');
      setBaseCost('');
    } catch (e) {
      alert("Failed to buy lot: " + e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-white rounded-[2.5rem] space-y-8 shadow-sm border border-stone-100 max-w-2xl">
      <div className="border-b border-stone-100 pb-4">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900">Inventory Intake</h3>
        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Standard 69kg Bag Calibration</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Source Farm</label>
          <select value={farmId} onChange={(e) => setFarmId(e.target.value)} 
            className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800">
            <option value="">Select Farm</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Variety</label>
            <select value={variety} onChange={(e) => setVariety(e.target.value)} className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm">
              <option value="Typica">Typica</option>
              <option value="Caturra">Caturra</option>
              <option value="Geisha">Geisha</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Process</label>
            <select value={processMethod} onChange={(e) => setProcessMethod(e.target.value)} className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm">
              <option value="Washed">Washed</option>
              <option value="Natural">Natural</option>
              <option value="Honey">Honey</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Approximate Weight (kg)</label>
          <input type="number" step="0.01" value={inputWeight} onChange={(e) => setInputWeight(e.target.value)} 
            className="w-full bg-stone-50 border-none rounded-xl p-4 text-lg font-black text-zinc-900" placeholder="e.g. 500" />
          
          {needsRounding && (
            <div className="mt-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="text-xl">⚖️</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Inventory Calibration Warning</p>
                <p className="text-xs text-amber-700 font-medium">
                  Rounding up to <span className="font-black">{roundedWeight}kg</span> ({Math.ceil(roundedWeight/69)} full bags).
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Base Farm Cost ($/kg)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
            <input type="number" step="0.01" value={baseCost} onChange={(e) => setBaseCost(e.target.value)} 
              className="w-full bg-stone-50 border-none rounded-xl p-4 pl-8 text-sm font-bold" />
          </div>
        </div>
      </div>

      <button type="submit" className="w-full bg-zinc-900 text-white p-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] hover:bg-black transition-all shadow-xl shadow-stone-200">
        Authorize Purchase & Generate Bags
      </button>
    </form>
  );
};

// --- NEW Component: Cost Ledger Form ---
const CostLedgerForm = () => {
  const { lots } = useStore();
  const [lotId, setLotId] = useState('');
  const [costType, setCostType] = useState('Transportation');
  const [amountUsd, setAmountUsd] = useState('');
  const [dateIncurred, setDateIncurred] = useState(new Date().toISOString().split('T')[0]);
  const triggerRefresh = useStore((state) => state.triggerRefresh);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lotId || !amountUsd) return;

    try {
      await createCostLedgerEntry({ lotId, costType, amountUsd, dateIncurred });
      alert("Successful: Cost added to ledger.");
      
      // Reset form
      setLotId('');
      setCostType('Transportation');
      setAmountUsd('');
      setDateIncurred(new Date().toISOString().split('T')[0]);
      triggerRefresh();
    } catch (err) {
      alert("Failed to add cost: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-2xl">
      <h3 className="text-lg font-semibold mb-4">Register Operations Cost</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Coffee Lot</label>
        <select value={lotId} onChange={(e) => setLotId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
          <option value="">Select Lot</option>
          {lots.map(l => (
            <option key={l.id} value={l.id}>{l.public_id} ({l.variety} - {l.total_weight_kg}kg)</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Cost Type</label>
          <select value={costType} onChange={(e) => setCostType(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
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
          <label className="block text-sm font-medium text-gray-700">Date Incurred</label>
          <input type="date" value={dateIncurred} onChange={(e) => setDateIncurred(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Total Amount (USD)</label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
          <input type="number" step="0.01" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} className="block w-full border border-gray-300 rounded-md shadow-sm p-2 pl-7" placeholder="0.00" />
        </div>
      </div>

      <button type="submit" className="mt-4 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 transition-colors text-white font-bold rounded-md shadow-sm">
        Register Cost to Ledger
      </button>
    </form>
  );
};

const ClientForm = () => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Other');
  const [country, setCountry] = useState('');
  const [port, setPort] = useState('');
  const [city, setCity] = useState('');
  const triggerRefresh = useStore((state) => state.triggerRefresh);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    await createClient({ name, relationship, country, port, city });
    alert("Successful: Client registered.");
    setName('');
    setRelationship('Other');
    setCountry('');
    setPort('');
    setCity('');
    triggerRefresh();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">New Client</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Relationship</label>
        <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          <option value="VIP">VIP</option>
          <option value="International">International</option>
          <option value="National">National</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Destination Country</label>
        <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Destination Port</label>
        <input type="text" value={port} onChange={(e) => setPort(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Destination City</label>
        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
      <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md">Add Client</button>
    </form>
  );
};

// --- Main DataEntry Component ---
const DataEntry = () => {
  const [activeTab, setActiveTab] = useState('producer');

  const renderForm = () => {
    switch (activeTab) {
      case 'producer':
        return <NewProducerForm />;
      case 'farm':
        return <NewFarmForm />;
      case 'buyCoffee':
        return <BuyCoffeeForm />;
      case 'costLedger': // New Case
        return <CostLedgerForm />;
      case 'cupping':
        return <SCAACuppingForm />; 
      case 'client':
        return <ClientForm />;
      default:
        return <NewProducerForm />;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Data Entry & Warehouse Intake</h2>
      <div className="bg-white shadow rounded-lg flex">
        {/* Sidebar/Tabs */}
        <div className="w-1/4 border-r border-gray-200 p-4 space-y-2">
          <TabButton name="producer" activeTab={activeTab} setActiveTab={setActiveTab}>New Producer</TabButton>
          <TabButton name="farm" activeTab={activeTab} setActiveTab={setActiveTab}>New Farm</TabButton>
          <TabButton name="buyCoffee" activeTab={activeTab} setActiveTab={setActiveTab}>Buy Coffee Lot</TabButton>
          {/* New Tab Inserted Here */}
          <TabButton name="costLedger" activeTab={activeTab} setActiveTab={setActiveTab}>Cost Ledger</TabButton>
          <TabButton name="cupping" activeTab={activeTab} setActiveTab={setActiveTab}>Cupping Session</TabButton>
          <TabButton name="client" activeTab={activeTab} setActiveTab={setActiveTab}>New Client</TabButton>
        </div>
        {/* Form Area */}
        <div className="w-3/4 p-4">
          {renderForm()}
        </div>
      </div>
    </div>
  );
};

const TabButton = React.memo(({ name, activeTab, setActiveTab, children }) => {
  const isActive = name === activeTab;
  return (
    <button
      onClick={() => setActiveTab(name)}
      className={`block w-full text-left px-4 py-2 rounded-md transition-colors ${
        isActive ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
});


export default DataEntry;