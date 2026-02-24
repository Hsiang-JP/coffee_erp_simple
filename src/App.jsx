import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import CoffeeJourney from './pages/CoffeeJourney';
import QCReports from './pages/QCReports';
import Allocation from './pages/Allocation';
import DataEntry from './pages/DataEntry';

import DevHUD from './pages/DevHUD';

import { initDB } from './db/dbSetup';
import { useStore } from './store/store';

function App() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isDevUrl = searchParams.get('dev')?.toLowerCase() === 'true';
  
  const [bootState, setBootState] = useState('init'); // 'init', 'syncing', 'ready', 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const fetchAll = useStore((state) => state.fetchAll);
  const refreshTrigger = useStore((state) => state.refreshTrigger);

  // Global Refresh Listener: Re-fetch all data when trigger increments
  useEffect(() => {
    if (bootState === 'ready') {
        fetchAll();
    }
  }, [refreshTrigger, bootState, fetchAll]);

  useEffect(() => {
    let isMounted = true;

    async function safeBoot() {
      try {
        // Phase 1: Init DB (WASM + Schema)
        console.log("🛠 [Safe Boot] Initializing WASM Engine...");
        await initDB();
        
        if (!isMounted) return;
        setBootState('syncing');

        // Phase 2: Sync Store
        console.log("📊 [Safe Boot] Syncing Store...");
        await fetchAll();
        
        if (!isMounted) return;
        setBootState('ready');
        console.log("✅ [Safe Boot] System Ready");
      } catch (e) {
        console.error("❌ [Safe Boot] Critical Failure:", e);
        if (isMounted) {
          setErrorMsg(e.message || 'Unknown boot error');
          setBootState('error');
        }
      }
    }

    safeBoot();

    return () => {
      isMounted = false;
    };
  }, [fetchAll]);

  if (bootState === 'error') {
    return (
      <div className="h-screen flex items-center justify-center bg-red-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-200 max-w-sm">
          <h1 className="text-red-600 font-bold mb-2">System Crash</h1>
          <p className="text-xs text-stone-500 mb-4">The application failed to initialize safely.</p>
          <code className="text-[10px] block bg-gray-100 p-2 rounded mb-4 text-left overflow-auto max-h-32">
            {errorMsg}
          </code>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
          >
            Hard Reload
          </button>
        </div>
      </div>
    );
  }

  if (bootState === 'init' || bootState === 'syncing') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] uppercase tracking-widest text-stone-400">
          {bootState === 'init' ? 'Initializing Engine...' : 'Syncing Data...'}
        </p>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={isDevUrl ? <DevHUD /> : <CoffeeJourney />} />
        <Route path="/qc" element={<QCReports />} />
        <Route path="/allocation" element={<Allocation />} />
        <Route path="/entry" element={<DataEntry />} />

        <Route path="/dev" element={<DevHUD />} />
      </Routes>
    </Layout>
  );
}

export default App;