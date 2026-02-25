import { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { execute, deleteRow, exportDatabase, importDatabase, wrapInTransaction } from '../db/dbSetup';
import { syncAllDatabaseLocations } from '../utils/geoAgent';

export function useDevData() {
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  const refreshTrigger = useStore((state) => state.refreshTrigger);
  const isDevMode = useStore((state) => state.isDevMode);

  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [data, setData] = useState({
    producers: [], clients: [], farms: [], lots: [], cost_ledger: [],
    bags: [], cupping_sessions: [], contracts: [], bag_milestones: [],
    locations: []
  });

  const loadAll = async () => {
    const loadTable = async (key, query) => {
      try {
        const res = await execute(query);
        setData(prev => ({ ...prev, [key]: res }));
      } catch (e) { console.error(`Error loading ${key}:`, e); }
    };

    await Promise.all([
      loadTable('producers', "SELECT * FROM producers"),
      loadTable('clients', "SELECT * FROM clients"),
      loadTable('locations', "SELECT * FROM locations"),
      loadTable('farms', "SELECT f.*, p.name as producer_name FROM farms f JOIN producers p ON f.producer_id = p.id"),
      loadTable('lots', "SELECT l.*, f.name as farm_name FROM lots l JOIN farms f ON l.farm_id = f.id"),
      loadTable('bags', "SELECT b.*, l.public_id as lot_public_id, c.public_id as contract_public_id FROM bags b JOIN lots l ON b.lot_id = l.id LEFT JOIN contracts c ON b.contract_id = c.id"),
      loadTable('contracts', "SELECT c.*, cl.name as client_name FROM contracts c JOIN clients cl ON c.client_id = cl.id"),
      loadTable('cost_ledger', "SELECT cl.*, l.public_id as lot_public_id FROM cost_ledger cl JOIN lots l ON cl.lot_id = l.id"),
      loadTable('cupping_sessions', "SELECT cs.*, l.public_id as lot_public_id FROM cupping_sessions cs JOIN lots l ON cs.lot_id = l.id"),
      loadTable('bag_milestones', "SELECT bm.*, b.public_id as bag_public_id, c.public_id as contract_public_id FROM bag_milestones bm JOIN bags b ON bm.bag_id = b.id LEFT JOIN contracts c ON b.contract_id = c.id")
    ]);
  };

  useEffect(() => {
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

  const handleImport = async (file) => {
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
    if (!confirm("SOFT CLEAN: This will clear all transactional data (Lots, Bags, Contracts) but keep Producers and Farms. Proceed?")) return;
    try {
      await wrapInTransaction(async () => {
        // Soft clean: clear transactional data only
        const tables = ['bag_milestones', 'cupping_sessions', 'cost_ledger', 'bags', 'contracts', 'lots'];
        for (const table of tables) { await execute(`DELETE FROM ${table}`); }
        try { await execute("DELETE FROM sqlite_sequence"); } catch (e) {}
      });
      alert("Transactional data cleared.");
      triggerRefresh();
    } catch (err) { alert("Clean failed: " + err.message); }
  };

  const handleDelete = async (table, id) => {
    if (!confirm(`FORCE DELETE from ${table}? (This will also delete all associated child records)`)) return;
    try {
      await deleteRow(table, id);
      triggerRefresh();
    } catch (e) { 
      console.error("Delete Failed:", e);
      alert("Delete Failed: " + e.message); 
    }
  };

  return {
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
  };
}