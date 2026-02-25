import React, { useState } from 'react';
import { useDevData } from '../hooks/useDevData';
import EditableCell from '../components/EditableCell';

const DataManagement = () => {
  const [activeTab, setActiveTab] = useState('producers');
  
  const {
    data,
    syncStatus,
    isSyncing,
    isExporting,
    isDevMode,
    handleSync,
    handleExport,
    handleImport,
    handleClean,
    handleDelete
  } = useDevData();

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

  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-zinc-100 flex flex-col gap-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">
            Dev HUD <span className="text-zinc-500 font-light">/ Data Control</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mt-1">Management Console V2</p>
        </div>
        
        <div className="flex gap-4 items-center">
          {syncStatus && (
            <div className="text-[10px] font-mono text-amber-500 animate-pulse uppercase tracking-[0.2em] mr-4 max-w-[200px] truncate">
              {syncStatus}
            </div>
          )}

          <div className="flex bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 gap-2">
            <button 
              onClick={handleSync} 
              disabled={isSyncing}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                isSyncing ? 'bg-zinc-800 text-zinc-500' : 'text-amber-400 hover:bg-amber-900/20'
              }`}
            >
              {isSyncing ? 'Syncing...' : 'Sync Geodata'}
            </button>

            <button onClick={handleClean} className="px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest">
              Clean
            </button>
          </div>

          <div className="flex bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 gap-2">
            <button onClick={handleExport} className="px-4 py-2 text-zinc-100 hover:bg-zinc-800 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
              Backup
            </button>
            <label className="px-4 py-2 text-emerald-400 hover:bg-emerald-900/20 rounded-lg cursor-pointer text-[9px] font-black uppercase tracking-widest transition-all">
              Restore
              <input type="file" onChange={(e) => handleImport(e.target.files[0])} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-zinc-800 pb-1 shrink-0">
        {Object.keys(tableConfig).map(key => (
          <button 
            key={key} 
            onClick={() => setActiveTab(key)} 
            className={`px-6 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === key ? 'bg-zinc-900 text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            {tableConfig[key].label}
          </button>
        ))}
      </div>

      {/* TABLE SECTION */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative flex-1 min-h-0 overflow-hidden">
        <div className="overflow-auto h-full no-scrollbar">
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-zinc-900/95 backdrop-blur-md text-zinc-500 uppercase tracking-widest font-black text-[9px] shadow-sm">
              <tr>
                <th className="p-6 w-12 text-zinc-700 font-mono">#</th>
                {tableConfig[activeTab].columns.map(col => (
                  <th key={col.key} className="p-6">{col.label}</th>
                ))}
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {data[activeTab]?.map((row, idx) => (
                <tr key={row.id} className="hover:bg-zinc-800/20 transition-colors group">
                  <td className="p-6 font-mono text-zinc-700">{idx + 1}</td>
                  {tableConfig[activeTab].columns.map(col => (
                    <td key={col.key} className="p-2 min-w-[160px]">
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
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => handleDelete(activeTab, row.id)} 
                      className="text-zinc-700 hover:text-red-500 font-bold px-3 py-1 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(!data[activeTab] || data[activeTab].length === 0) && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-700">
               <span className="text-4xl mb-4 opacity-20">📭</span>
               <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Data in {tableConfig[activeTab].label}</p>
            </div>
          )}
        </div>

        {!isDevMode && (
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-[4px] z-50 flex items-center justify-center p-8">
            <div className="bg-zinc-900 text-emerald-400 font-mono text-[10px] uppercase tracking-[0.4em] px-12 py-6 rounded-2xl shadow-2xl border border-emerald-500/20 animate-pulse text-center">
              RESTRICTED ACCESS AREA<br/>
              <span className="text-zinc-600 mt-2 block font-sans">Use Toggle Switch to Unlock Console</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataManagement;