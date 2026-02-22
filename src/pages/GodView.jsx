import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useCoffeeData } from '../hooks/useCoffeeData';
import CoffeeMap from '../components/CoffeeMap';
import CostStepper from '../components/CostStepper';

const GodView = () => {
  useCoffeeData(); // Initialize data
  const coffees = useStore((state) => state.coffees);
  const milestones = useStore((state) => state.milestones);
  
  const [selectedBagId, setSelectedBagId] = useState(null);

  // Default to first bag if available
  useEffect(() => {
    if (coffees.length > 0 && !selectedBagId) {
      setSelectedBagId(coffees[0].id);
    }
  }, [coffees]);

  const selectedBag = coffees.find(c => c.id === selectedBagId);
  const selectedMilestone = milestones.find(m => m.bag_id === selectedBagId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Sidebar / Selection */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Live Inventory</h2>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {coffees.map((bag) => (
            <div 
              key={bag.id}
              onClick={() => setSelectedBagId(bag.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedBagId === bag.id 
                  ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' 
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-gray-900">{bag.public_id}</p>
                    <p className="text-sm text-gray-500">{bag.variety} - {bag.process_method}</p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {bag.current_stage || 'Unknown'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
                Global Traceability 
                {selectedBag && <span className="text-gray-400 font-normal ml-2">/ {selectedBag.farm_name}</span>}
            </h2>
            <CoffeeMap currentStage={selectedMilestone?.current_stage || 'Farm'} />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <CostStepper 
                currentStage={selectedMilestone?.current_stage || 'Farm'} 
                costs={selectedMilestone}
             />
        </div>
      </div>
    </div>
  );
};

export default GodView;
