import React, { useState } from 'react';
import { execute, initDB } from '../db/dbSetup';
import { useStore } from '../store';

const DevHUD = () => {
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  const coffees = useStore((state) => state.coffees);
  const [selectedBag, setSelectedBag] = useState('');
  const [targetStage, setTargetStage] = useState('Cora');

  const stages = ['Farm', 'Cora', 'Transportation', 'Port', 'Final Destination'];

  const handleSeed = async () => {
     // Re-run seed? We should probably clear first or check if empty.
     // For now, let's just log or maybe add more data.
     // The DB setup checks for existing data, so let's just clear and seed.
     if (confirm('This will wipe all data and re-seed. Continue?')) {
        await execute('DELETE FROM bag_milestones');
        await execute('DELETE FROM cupping_sessions');
        await execute('DELETE FROM bags');
        await execute('DELETE FROM contracts');
        await execute('DELETE FROM lots');
        await execute('DELETE FROM farms');
        await execute('DELETE FROM producers');
        // Reload page to re-trigger initDB seed logic or call it manually
        window.location.reload(); 
     }
  };

  const handleAdvance = async () => {
    if (!selectedBag) return;
    
    // Update DB
    await execute(`
       UPDATE bag_milestones 
       SET current_stage = '${targetStage}'
       WHERE bag_id = '${selectedBag}'
    `);
    
    // Also update bag status if needed (e.g., if Shipped)
    if (targetStage === 'Transportation') {
        await execute(`UPDATE bags SET status = 'Shipped' WHERE id = '${selectedBag}'`);
    }

    triggerRefresh();
    alert(`Bag ${selectedBag} moved to ${targetStage}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Data Controls</h2>
          <div className="flex gap-4">
             <button 
                onClick={handleSeed}
                className="bg-red-50 text-red-700 px-4 py-2 rounded border border-red-200 hover:bg-red-100"
             >
                Reset & Seed Database
             </button>
             <button 
                onClick={() => triggerRefresh()}
                className="bg-blue-50 text-blue-700 px-4 py-2 rounded border border-blue-200 hover:bg-blue-100"
             >
                Force Refresh Store
             </button>
          </div>
       </div>

       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Supply Chain Simulator</h2>
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Select Bag</label>
                <select 
                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                   value={selectedBag}
                   onChange={(e) => setSelectedBag(e.target.value)}
                >
                   <option value="">-- Choose a Bag --</option>
                   {coffees.map(b => (
                      <option key={b.id} value={b.id}>
                         {b.public_id} ({b.current_stage})
                      </option>
                   ))}
                </select>
             </div>
             
             <div>
                <label className="block text-sm font-medium text-gray-700">Target Stage</label>
                <select 
                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                   value={targetStage}
                   onChange={(e) => setTargetStage(e.target.value)}
                >
                   {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>

             <button 
                onClick={handleAdvance}
                disabled={!selectedBag}
                className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded hover:bg-emerald-700 disabled:opacity-50"
             >
                Advance Stage & Trigger Animation
             </button>
          </div>
       </div>
    </div>
  );
};

export default DevHUD;
