import React, { useState, useMemo } from 'react'; // Added useMemo
import { useStore } from '../store/store';
import { wrapInTransaction } from '../db/dbSetup';
import { execute } from '../db/dbSetup';
import { generateStockCodes } from '../utils/warehouseUtils';
import { useBuyLot } from '../hooks/useCoffeeData';
import SCAACuppingForm from '../components/SCAACuppingForm';

// --- Form Components (To be implemented) ---
const NewProducerForm = () => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Other');
  const triggerRefresh = useStore((state) => state.triggerRefresh);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    await execute('INSERT INTO producers (id, name, relationship) VALUES (?, ?, ?)', [`prod-${Date.now()}`, name, relationship]);
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

const NewFarmForm = () => {
  const { producers } = useStore();
  const [producerId, setProducerId] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('Other');
  const [altitude, setAltitude] = useState('');
  const [location, setLocation] = useState('Other');
  const [certification, setCertification] = useState('None');
  const triggerRefresh = useStore((state) => state.triggerRefresh);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!producerId || !name) return;
    await execute(
      'INSERT INTO farms (id, producer_id, name, region, altitude_meters, location, certification) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`farm-${Date.now()}`, producerId, name, region, parseFloat(altitude) || null, location, certification]
    );
    alert("Successful: Farm registered.");
    setProducerId('');
    setName('');
    setRegion('Other');
    setAltitude('');
    setLocation('Other');
    setCertification('None');
    triggerRefresh();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">New Farm</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700">Producer</label>
        <select value={producerId} onChange={(e) => setProducerId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          <option value="">Select Producer</option>
          {producers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Region</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          <option value="Cusco">Cusco</option>
          <option value="Cajamarca">Cajamarca</option>
          <option value="Junin">Junin</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Altitude (meters)</label>
        <input type="number" value={altitude} onChange={(e) => setAltitude(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Location</label>
        <select value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          <option value="Quillabamba">Quillabamba</option>
          <option value="Santa Teresa">Santa Teresa</option>
          <option value="Quellouno">Quellouno</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Certification</label>
        <select value={certification} onChange={(e) => setCertification(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          <option value="Organic">Organic</option>
          <option value="Fair Trade">Fair Trade</option>
          <option value="Rainforest Alliance">Rainforest Alliance</option>
          <option value="None">None</option>
        </select>
      </div>
      <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md">Add Farm</button>
    </form>
  );
};

const BuyCoffeeForm = () => {
  const { farms } = useStore();
  const [farmId, setFarmId] = useState('');
  const [variety, setVariety] = useState('Other');
  const [processMethod, setProcessMethod] = useState('Other');
  const [inputWeight, setInputWeight] = useState(''); // Raw user input
  const [baseCost, setBaseCost] = useState('');
  const buyLot = useBuyLot();

  // --- Real-time Weight Math ---
  const BAG_SIZE = 69.0;
  
  // Calculate how much we need to round up to reach the next full 69kg bag
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
        total_weight_kg: roundedWeight, // Use the rounded value for DB insertion
        base_farm_cost_per_kg: parseFloat(baseCost),
      });
      alert("Successful: Lot intake complete.");
      // Reset form
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
        {/* Farm Selection */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Source Farm</label>
          <select value={farmId} onChange={(e) => setFarmId(e.target.value)} 
            className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold text-zinc-800">
            <option value="">Select Farm</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {/* Variety & Process */}
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

        {/* Weight Input with Rounding Logic */}
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

        {/* Financials */}
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
    await execute(
      'INSERT INTO clients (id, name, relationship, destination_country, destination_port, destination_city) VALUES (?, ?, ?, ?, ?, ?)',
      [`cli-${Date.now()}`, name, relationship, country, port, city]
    );
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
      case 'cupping':
        return <SCAACuppingForm />; // To be implemented
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

const TabButton = ({ name, activeTab, setActiveTab, children }) => {
  const isActive = name === activeTab;
  return (
    <button
      onClick={() => setActiveTab(name)}
      className={`block w-full text-left px-4 py-2 rounded-md ${
        isActive ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
};

export default DataEntry;