import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import GodView from './pages/GodView';
import QCReports from './pages/QCReports';
import Allocation from './pages/Allocation';
import DevHUD from './pages/DevHUD';

function App() {
  return (
    <Layout>
        <Routes>
            <Route path="/" element={<GodView />} />
            <Route path="/qc" element={<QCReports />} />
            <Route path="/allocation" element={<Allocation />} />
            <Route path="/dev" element={<DevHUD />} />
        </Routes>
    </Layout>
  );
}

export default App;
