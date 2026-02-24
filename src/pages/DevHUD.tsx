import React, { useState, useMemo, ChangeEvent } from 'react';
import { deleteRow, exportDatabase, importDatabase, compactWarehouse } from '../db/dbSetup';
import { useStore } from '../store/store';
// @ts-ignore
import EditableCell from '../components/EditableCell';

interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[];
  disabled?: boolean;
}

interface TableConfig {
  label: string;
  columns: ColumnConfig[];
}

const tableConfig: Record<string, TableConfig> = {
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
      { key: 'total_weight_kg', label: 'Weight (kg)', type: 'number', disabled: true }, 
      { key: 'harvest_date', label: 'Harvested', type: 'text' }, 
      { key: 'base_farm_cost_per_kg', label: 'Farm Cost', type: 'number' }
    ] 
  },
  bags: { 
    label: 'Bags', 
    columns: [
      { key: 'public_id', label: 'Bag ID', type: 'text', disabled: true }, 
      { key: 'lot_public_id', label: 'Lot (Link)', type: 'text', disabled: true }, 
      { key: 'weight_kg', label: 'Weight', type: 'number', disabled: true }, 
      { key: 'warehouse_location', label: 'Warehouse', type: 'text' }, 
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
      { key: 'status', label: 'Status', type: 'select', options: ['Processing', 'Fulfilled'] }, 
      { key: 'current_stage', label: 'Stage', type: 'select', options: ['Farm', 'Cora', 'Port-Export', 'Port-Import', 'Final Destination'] }
    ] 
  },
  cost_ledger: { 
    label: 'Cost Ledger', 
    columns: [
      { key: 'public_id', label: 'Record ID', type: 'text', disabled: true }, 
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
      { key: 'total_score', label: 'Total', type: 'number' }, 
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
      { key: 'landed_cost', label: 'Landed KG', type: 'number', disabled: true }
    ] 
  },
  contract_metrics: { 
    label: 'Aggregated Metrics', 
    columns: [
      { key: 'public_id', label: 'CTR ID', type: 'text', disabled: true }, 
      { key: 'total_weight', label: 'Weight (kg)', type: 'number', disabled: true }, 
      { key: 'avg_landed_cost', label: 'Avg Landed', type: 'number', disabled: true }, 
      { key: 'total_contract_cost', label: 'Total Value', type: 'number', disabled: true }
    ] 
  }
};

const DataManagement: React.FC = () => {
  const { 
    producers, 
    clients, 
    farms, 
    lots, 
    ledger, 
    coffees, 
    cuppingReports, 
    contracts, 
    milestones, 
    contractMetrics, 
    triggerRefresh, 
    isDevMode 
  } = useStore();

  const [activeTab, setActiveTab] = useState<string>('producers');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const data: Record<string, any[]> = useMemo(() => ({
    producers,
    clients,
    farms,
    lots,
    cost_ledger: ledger,
    bags: coffees,
    cupping_sessions: cuppingReports,
    contracts,
    bag_milestones: milestones,
    contract_metrics: contractMetrics
  }), [producers, clients, farms, lots, ledger, coffees, cuppingReports, contracts, milestones, contractMetrics]);

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
    } catch (err: any) { 
        alert("Export failed: " + err.message); 
    } finally { 
        setIsExporting(false); 
    }
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const result = event.target?.result;
            if (typeof result === 'string') {
                await importDatabase(result);
                alert("Database restored!");
                triggerRefresh();
            }
        } catch (err: any) { 
            alert("Restoration failed: " + err.message); 
        }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (table: string, id: string) => {
    if (confirm(`Delete this entry? (Traceability Lock apply)`)) {
        try {
            await deleteRow(table, id);
            triggerRefresh();
        } catch (e) { 
            alert("Traceability Lock: Referenced record."); 
        }
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      <div className="w-64 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 bg-stone-900 text-white font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Maintenance
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {Object.entries(tableConfig).map(([id, config]) => (
                <button 
                    key={id} 
                    onClick={() => setActiveTab(id)} 
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-xs transition-all flex justify-between items-center group ${activeTab === id ? 'bg-stone-900 text-white font-bold' : 'text-stone-500 hover:bg-stone-50'}`}
                >
                    {config.label}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === id ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-400'}`}>
                        {data[id]?.length || 0}
                    </span>
                </button>
            ))}
        </nav>
        <div className="p-4 border-t border-stone-100 bg-stone-50 space-y-2">
            <button 
                onClick={async () => {
                    if(confirm("Trigger global warehouse reorganization?")) {
                        await compactWarehouse();
                        alert("Warehouse Optimized: All bags shifted to ground level.");
                    }
                }}
                className="w-full text-[10px] font-bold uppercase bg-white border border-emerald-200 text-emerald-600 py-2 rounded hover:bg-emerald-50 flex items-center justify-center gap-2 transition-all"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                Compact Grid
            </button>
            <button 
                onClick={handleExport} 
                disabled={isExporting} 
                className="w-full text-[10px] font-bold uppercase bg-white border border-stone-200 text-stone-600 py-2 rounded hover:bg-stone-100 flex items-center justify-center gap-2"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                {isExporting ? 'Exporting...' : 'Backup JSON'}
            </button>
            <label className="w-full text-[10px] font-bold uppercase bg-white border border-stone-200 text-stone-600 py-2 rounded hover:bg-stone-100 flex items-center justify-center gap-2 cursor-pointer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path></svg>
                Restore JSON
                <input type="file" className="hidden" accept=".json" onChange={handleImport} />
            </label>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col overflow-hidden relative">
        <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-white">
            <div>
                <h2 className="text-lg font-bold text-stone-900">{tableConfig[activeTab].label}</h2>
                <p className="text-[10px] text-stone-400 font-mono uppercase tracking-wider italic">Only operational fields are visible. Structural IDs are locked.</p>
            </div>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-max">
                <thead className="sticky top-0 bg-stone-50 text-stone-500 uppercase text-[9px] font-black border-b border-stone-200 z-10">
                    <tr>
                        <th className="p-4 bg-stone-50 w-12 text-stone-300 italic">#</th>
                        {tableConfig[activeTab].columns.map(col => <th key={col.key} className="p-4 bg-stone-50">{col.label}</th>)}
                        <th className="p-4 bg-stone-50 w-10 text-right text-stone-300">X</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                    {data[activeTab]?.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-emerald-50/10 group transition-colors">
                            <td className="p-4 font-mono text-[10px] text-stone-300 italic">{idx + 1}</td>
                            {tableConfig[activeTab].columns.map(col => (
                                <td key={col.key} className={`p-2 ${col.disabled ? 'bg-stone-50/20' : ''}`}>
                                    <EditableCell 
                                        tableName={activeTab} 
                                        id={row.id} 
                                        column={col.key} 
                                        value={row[col.key]} 
                                        type={col.type} 
                                        options={col.options} 
                                        forceDisabled={col.disabled} 
                                    />
                                </td>
                            ))}
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => handleDelete(activeTab, row.id)} 
                                    className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {!isDevMode && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none">
                <div className="bg-stone-900 text-emerald-400 font-mono text-[10px] uppercase tracking-[0.3em] px-8 py-4 rounded shadow-2xl border border-emerald-500/20 animate-pulse pointer-events-auto">
                    Restricted Area • Use Toggle Switch to Unlock
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DataManagement;
