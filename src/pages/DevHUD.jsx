import React, { useState, useEffect } from 'react';
import { execute, deleteRow, exportDatabase, importDatabase, wrapInTransaction, seedDataInternal } from '../db/dbSetup';
import { useStore } from '../store/store';
import EditableCell from '../components/EditableCell';

const DataManagement = () => {
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  const refreshTrigger = useStore((state) => state.refreshTrigger);
  const isDevMode = useStore((state) => state.isDevMode);

  const [activeTab, setActiveTab] = useState('producers');
  const [isExporting, setIsExporting] = useState(false);
  const [data, setData] = useState({
    producers: [], clients: [], farms: [], lots: [], cost_ledger: [],
    bags: [], cupping_sessions: [], contracts: [], bag_milestones: []
  });

  // Table Configuration (Abbreviated for clarity)
  const tableConfig = {
    producers: { label: 'Producers', columns: [{ key: 'name', label: 'Name', type: 'text' }] },
    // ... rest of your config remains the same
  };

  useEffect(() => {
    async function loadAll() {
      const loadTable = async (key, query) => {
        try {
          const res = await execute(query);
          setData(prev => ({ ...prev, [key]: res }));
        } catch (e) { console.error(`Error loading ${key}:`, e); }
      };

      loadTable('producers', "SELECT * FROM producers");
      loadTable('clients', "SELECT * FROM clients");
      loadTable('farms', "SELECT f.*, p.name as producer_name FROM farms f JOIN producers p ON f.producer_id = p.id");
      loadTable('lots', "SELECT l.*, f.name as farm_name FROM lots l JOIN farms f ON l.farm_id = f.id");
      loadTable('bags', "SELECT b.*, l.public_id as lot_public_id, c.public_id as contract_public_id FROM bags b JOIN lots l ON b.lot_id = l.id LEFT JOIN contracts c ON b.contract_id = c.id");
      loadTable('contracts', "SELECT c.*, cl.name as client_name FROM contracts c JOIN clients cl ON c.client_id = cl.id");
      loadTable('cost_ledger', "SELECT cl.*, l.public_id as lot_public_id FROM cost_ledger cl JOIN lots l ON cl.lot_id = l.id");
      loadTable('cupping_sessions', "SELECT cs.*, l.public_id as lot_public_id FROM cupping_sessions cs JOIN lots l ON cs.lot_id = l.id");
      loadTable('bag_milestones', "SELECT bm.*, b.public_id as bag_public_id, c.public_id as contract_public_id FROM bag_milestones bm JOIN bags b ON bm.bag_id = b.id LEFT JOIN contracts c ON b.contract_id = c.id");
    }
    loadAll();
  }, [refreshTrigger]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const json = await exportDatabase();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coffee_erp_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert("Export failed: " + err.message); } 
    finally { setIsExporting(false); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await importDatabase(event.target.result);
        alert("Database restored!");
        triggerRefresh();
      } catch (err) { alert("Restoration failed: " + err.message); }
    };
    reader.readAsText(file);
  };

  const handleDeleteAllData = async () => {
    if (!confirm("Are you sure you want to delete ALL data and re-seed?")) return;
    try {
      await wrapInTransaction(async () => {
        const tables = ['bag_milestones', 'cupping_sessions', 'cost_ledger', 'bags', 'contracts', 'lots', 'farms', 'producers', 'clients'];
        for (const table of tables) {
          await execute(`DELETE FROM ${table}`);
        }
      });
      await seedDataInternal();
      alert("System Reset & Re-seeded.");
      triggerRefresh();
    } catch (err) { alert("Reset failed: " + err.message); }
  };

  const handleDelete = async (table, id) => {
    if (!confirm(`Delete entry from ${table}?`)) return;
    try {
      await deleteRow(table, id);
      triggerRefresh();
    } catch (e) { alert("Referential Integrity: Cannot delete record while it is linked elsewhere."); }
  };

  // --- RENDER SECTION ---
  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-zinc-100">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold tracking-tighter uppercase italic">Dev HUD / <span className="text-zinc-500">Data Simulator</span></h1>
        <div className="flex gap-4">
          <button onClick={handleDeleteAllData} className="px-4 py-2 bg-red-900/20 text-red-400 border border-red-900/50 rounded-lg hover:bg-red-900/40 transition-all text-xs font-bold uppercase tracking-widest">
            Nuke & Seed
          </button>
          <button onClick={handleExport} className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 text-xs font-bold uppercase tracking-widest">
            Backup JSON
          </button>
          <label className="px-4 py-2 bg-emerald-900/20 text-emerald-400 border border-emerald-900/50 rounded-lg hover:bg-emerald-900/40 cursor-pointer text-xs font-bold uppercase tracking-widest">
            Restore
            <input type="file" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto mb-6 no-scrollbar border-b border-zinc-800 pb-2">
        {Object.keys(tableConfig).map(key => (
          <button key={key} onClick={() => setActiveTab(key)} className={`px-4 py-2 rounded-t-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === key ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {tableConfig[key].label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-800/50 text-zinc-400 uppercase tracking-tighter font-bold">
            <tr>
              {tableConfig[activeTab].columns.map(col => <th key={col.key} className="p-4">{col.label}</th>)}
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data[activeTab]?.map(row => (
              <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                {tableConfig[activeTab].columns.map(col => (
                  <td key={col.key} className="p-4 font-mono text-zinc-300">
                    {row[col.key]}
                  </td>
                ))}
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(activeTab, row.id)} className="text-zinc-600 hover:text-red-400 font-bold px-2">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataManagement;