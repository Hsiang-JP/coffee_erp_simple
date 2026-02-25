import React, { useState, useEffect } from 'react';
import { execute, deleteRow, exportDatabase, importDatabase, wrapInTransaction } from '../db/dbSetup';
import { runSimulation } from '../utils/simulation';
import { useStore } from '../store/store';
import EditableCell from '../components/EditableCell';
import { syncAllDatabaseLocations } from '../utils/geoAgent';

const DataManagement = () => {
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  const refreshTrigger = useStore((state) => state.refreshTrigger);
  const isDevMode = useStore((state) => state.isDevMode);

  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('producers');
  const [isExporting, setIsExporting] = useState(false);
  const [data, setData] = useState({
    producers: [], clients: [], farms: [], lots: [], cost_ledger: [],
    bags: [], cupping_sessions: [], contracts: [], bag_milestones: [],
    locations: []
  });

  const tableConfig = {
    producers: { 
        label: 'Producers', 
        columns: [
            { key: 'name', label: 'Name', type: 'text' }, 
            { key: 'relationship', label: 'Relationship', type: 'select', options: ['Important', 'Direct Trade', 'Co-op', 'Other'] }
        ] 
    },
    clients: { 
        label: 'Clients', 
        columns: [
            { key: 'name', label: 'Name', type: 'text' }, 
            { key: 'relationship', label: 'Relationship', type: 'select', options: ['VIP', 'International', 'National', 'Other'] },
            { key: 'destination_country', label: 'Country', type: 'text' },
            { key: 'destination_port', label: 'Port', type: 'text' },
            { key: 'destination_city', label: 'City', type: 'text' }
        ] 
    },
    farms: { 
        label: 'Farms', 
        columns: [
            { key: 'name', label: 'Farm Name', type: 'text' }, 
            { key: 'producer_name', label: 'Producer (Link)', type: 'text', disabled: true }, 
            { key: 'region', label: 'Region', type: 'select', options: ['Cusco', 'Cajamarca', 'Junin', 'Other'] }, 
            { key: 'altitude_meters', label: 'Altitude (m)', type: 'number' }, 
            { key: 'location', label: 'Location', type: 'text' }, 
            { key: 'certification', label: 'Cert', type: 'select', options: ['Organic', 'Fair Trade', 'Rainforest Alliance', 'None'] }
        ] 
    },
    lots: { 
        label: 'Lots', 
        columns: [
            { key: 'public_id', label: 'Lot ID', type: 'text', disabled: true }, 
            { key: 'farm_name', label: 'Farm (Link)', type: 'text', disabled: true }, 
            { key: 'variety', label: 'Variety', type: 'select', options: ['Typica', 'Caturra', 'Catuai', 'Geisha', 'Other'] }, 
            { key: 'process_method', label: 'Process', type: 'select', options: ['Washed', 'Natural', 'Honey', 'Anaerobic', 'Other'] }, 
            { key: 'total_weight_kg', label: 'Weight (kg)', type: 'number' }, 
            { key: 'harvest_date', label: 'Harvested', type: 'text' }, 
            { key: 'base_farm_cost_per_kg', label: 'Farm Cost', type: 'number' }
        ] 
    },
    bags: { 
        label: 'Bags', 
        columns: [
            { key: 'public_id', label: 'Bag ID', type: 'text', disabled: true }, 
            { key: 'lot_public_id', label: 'Lot (Link)', type: 'text', disabled: true }, 
            { key: 'weight_kg', label: 'Weight', type: 'number' }, 
            { key: 'location', label: 'Location', type: 'text' }, 
            { key: 'stock_code', label: 'Position', type: 'text' }, 
            { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Allocated', 'Shipped'] }, 
            { key: 'contract_public_id', label: 'Contract (Link)', type: 'text', disabled: true }
        ] 
    },
    contracts: { 
        label: 'Contracts', 
        columns: [
            { key: 'public_id', label: 'CTR ID', type: 'text', disabled: true }, 
            { key: 'client_name', label: 'Client (Link)', type: 'text', disabled: true }, 
            { key: 'sale_price_per_kg', label: 'Agreed Price', type: 'number' }, 
            { key: 'required_quality_score', label: 'Min Score', type: 'number' }, 
            { key: 'status', label: 'Status', type: 'select', options: ['Processing', 'Fulfilled'] }
        ] 
    },
    cost_ledger: { 
        label: 'Cost Ledger', 
        columns: [
            { key: 'lot_public_id', label: 'Lot (Link)', type: 'text', disabled: true }, 
            { key: 'cost_type', label: 'Type', type: 'select', options: ['Milling', 'Drying', 'Sorting', 'Lab/Grading', 'Packaging', 'Transportation', 'Other'] }, 
            { key: 'amount_usd', label: 'Amount $', type: 'number' }, 
            { key: 'date_incurred', label: 'Date', type: 'text' }
        ] 
    },
    cupping_sessions: { 
        label: 'Cupping Sessions', 
        columns: [
            { key: 'public_id', label: 'QC ID', type: 'text', disabled: true }, 
            { key: 'lot_public_id', label: 'Lot (Link)', type: 'text', disabled: true }, 
            { key: 'cupper_name', label: 'Cupper', type: 'text' }, 
            { key: 'total_score', label: 'Total', type: 'number', disabled: true }, 
            { key: 'primary_flavor_note', label: 'Top Note', type: 'text' }
        ] 
    },
    bag_milestones: { 
        label: 'Value Chain', 
        columns: [
            { key: 'bag_public_id', label: 'Bag (Link)', type: 'text', disabled: true }, 
            { key: 'contract_public_id', label: 'Contract (Link)', type: 'text', disabled: true }, 
            { key: 'current_stage', label: 'Stage', type: 'text', disabled: true }, 
            { key: 'cost_to_warehouse', label: 'To Cora', type: 'number' }, 
            { key: 'cost_to_export', label: 'To Export', type: 'number' }, 
            { key: 'cost_to_import', label: 'To Import', type: 'number' }, 
            { key: 'cost_to_client', label: 'To Client', type: 'number' }, 
            { key: 'final_sale_price', label: 'Total Value', type: 'number', disabled: true }
        ] 
    },
    locations: {
        label: 'GEO',
        columns: [
            { key: 'name', label: 'Place Name', type: 'text' },
            { key: 'type', label: 'Type', type: 'select', options: ['Farm/Region', 'Warehouse', 'Port', 'Client/City', 'Other'] },
            { key: 'latitude', label: 'Lat', type: 'number' },
            { key: 'longitude', label: 'Lon', type: 'number' }
        ]
    }
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
      loadTable('locations', "SELECT * FROM locations");
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

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus("Starting Geodata Sync...");
    try {
      const total = await syncAllDatabaseLocations((msg) => setSyncStatus(msg));
      setSyncStatus(`Sync Complete! ${total} locations mapped.`);
      triggerRefresh(); 
    } catch (err) {
      setSyncStatus(`Sync Failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

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

  const handleClean = async () => {
    if (!confirm("TOTAL WIPE: This will empty ALL data tables. Proceed?")) return;
    try {
      await wrapInTransaction(async () => {
        await execute("PRAGMA foreign_keys = OFF;");
        const tables = ['bag_milestones', 'cupping_sessions', 'cost_ledger', 'bags', 'contracts', 'lots', 'farms', 'producers', 'clients', 'locations'];
        for (const table of tables) { await execute(`DELETE FROM ${table}`); }
        try { await execute("DELETE FROM sqlite_sequence"); } catch (e) {}
        await execute("PRAGMA foreign_keys = ON;");
      });
      alert("System clean.");
      triggerRefresh();
    } catch (err) { alert("Clean failed: " + err.message); }
  };

  const handleDelete = async (table, id) => {
    if (!confirm(`FORCE DELETE from ${table}?`)) return;
    try {
      await wrapInTransaction(async () => {
        await execute("PRAGMA foreign_keys = OFF;");
        await deleteRow(table, id);
        await execute("PRAGMA foreign_keys = ON;");
      });
      triggerRefresh();
    } catch (e) { alert("Delete Failed: " + e.message); }
  };

  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-zinc-100 flex flex-col gap-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-2xl font-bold tracking-tighter uppercase italic">
          Dev HUD / <span className="text-zinc-500">Data Simulator</span>
        </h1>
        
        <div className="flex gap-4 items-center">
          {syncStatus && (
            <div className="text-[10px] font-mono text-amber-500 animate-pulse uppercase tracking-[0.2em] mr-4 max-w-[200px] truncate">
              {syncStatus}
            </div>
          )}

          <button 
            onClick={handleSync} 
            disabled={isSyncing}
            className={`px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              isSyncing ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-amber-900/20 text-amber-400 border-amber-900/50 hover:bg-amber-900/40'
            }`}
          >
            {isSyncing ? '📡 Syncing...' : '📡 Sync Geodata'}
          </button>

          <button onClick={runSimulation} className="px-4 py-2 bg-indigo-900/20 text-indigo-400 border border-indigo-900/50 rounded-lg hover:bg-indigo-900/40 transition-all text-xs font-bold uppercase tracking-widest">
            Simulate
          </button>
          
          <button onClick={handleClean} className="px-4 py-2 bg-red-900/20 text-red-400 border border-red-900/50 rounded-lg hover:bg-red-900/40 transition-all text-xs font-bold uppercase tracking-widest">
            Clean
          </button>

          <button onClick={handleExport} className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 text-xs font-bold uppercase tracking-widest">
            Backup
          </button>
          <label className="px-4 py-2 bg-emerald-900/20 text-emerald-400 border border-emerald-900/50 rounded-lg hover:bg-emerald-900/40 cursor-pointer text-xs font-bold uppercase tracking-widest">
            Restore
            <input type="file" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* TAB NAVIGATION: Scrollable horizontally */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-zinc-800 pb-1 shrink-0">
        {Object.keys(tableConfig).map(key => (
          <button 
            key={key} 
            onClick={() => setActiveTab(key)} 
            className={`px-4 py-2 rounded-t-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === key ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tableConfig[key].label}
          </button>
        ))}
      </div>

      {/* TABLE SECTION: Sticky Header and Vertical/Horizontal Scroll */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl relative flex-1 min-h-0">
        <div className="overflow-auto h-full max-h-[65vh] no-scrollbar">
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-zinc-800 text-zinc-400 uppercase tracking-tighter font-bold shadow-sm">
              <tr>
                <th className="p-4 w-12 text-zinc-600 font-mono bg-zinc-800 rounded-tl-2xl">#</th>
                {tableConfig[activeTab].columns.map(col => (
                  <th key={col.key} className="p-4 bg-zinc-800 whitespace-nowrap">{col.label}</th>
                ))}
                <th className="p-4 text-right bg-zinc-800 rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data[activeTab]?.map((row, idx) => (
                <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="p-4 font-mono text-zinc-600 bg-zinc-900/50">{idx + 1}</td>
                  {tableConfig[activeTab].columns.map(col => (
                    <td key={col.key} className="p-1 min-w-[140px]">
                      <EditableCell 
                        tableName={activeTab} 
                        id={row.id} 
                        column={col.key} 
                        value={row[col.key]} 
                        type={col.type || 'text'} 
                        options={col.options}
                        forceDisabled={col.disabled}
                      />
                    </td>
                  ))}
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(activeTab, row.id)} 
                      className="text-zinc-600 hover:text-red-400 font-bold px-2 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isDevMode && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-zinc-900 text-emerald-400 font-mono text-[10px] uppercase tracking-[0.3em] px-8 py-4 rounded shadow-2xl border border-emerald-500/20 animate-pulse pointer-events-auto">
              Restricted Area • Use Toggle Switch to Unlock
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataManagement;