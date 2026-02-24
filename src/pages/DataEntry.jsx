import React, { useState } from 'react';
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
  const { farms, lots } = useStore();
  const [farmId, setFarmId] = useState('');
  const [variety, setVariety] = useState('Other');
  const [processMethod, setProcessMethod] = useState('Other');
  const [totalWeight, setTotalWeight] = useState('');
  const [baseCost, setBaseCost] = useState('');
  const buyLot = useBuyLot(); // Use the refactored hook

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!farmId || !totalWeight || !baseCost) return;
    
    try {
      await buyLot({
        farm_id: farmId,
        variety,
        process_method: processMethod,
        total_weight_kg: parseFloat(totalWeight),
        base_farm_cost_per_kg: parseFloat(baseCost),
      });
      setFarmId('');
      setVariety('Other');
      setProcessMethod('Other');
      setTotalWeight('');
      setBaseCost('');
    } catch (e) {
      alert("Failed to buy lot: " + e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Buy Coffee Lot</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700">Farm</label>
        <select value={farmId} onChange={(e) => setFarmId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          <option value="">Select Farm</option>
          {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Variety</label>
        <select value={variety} onChange={(e) => setVariety(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          <option value="Typica">Typica</option>
          <option value="Caturra">Caturra</option>
          <option value="Catuai">Catuai</option>
          <option value="Geisha">Geisha</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Process Method</label>
        <select value={processMethod} onChange={(e) => setProcessMethod(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          <option value="Washed">Washed</option>
          <option value="Natural">Natural</option>
          <option value="Honey">Honey</option>
          <option value="Anaerobic">Anaerobic</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Total Weight (kg)</label>
        <input type="number" step="0.01" value={totalWeight} onChange={(e) => setTotalWeight(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Base Cost ($/kg)</label>
        <input type="number" step="0.01" value={baseCost} onChange={(e) => setBaseCost(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
      <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md">Buy Lot</button>
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