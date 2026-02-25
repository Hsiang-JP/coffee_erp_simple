import React from 'react';
import { useCuppingFilters } from '../hooks/useCuppingFilters';

const QCReports = () => {
  const { filters, setFilters, results, options } = useCuppingFilters();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Sub-component for the sensory attribute bars
  const AttributeBar = ({ label, value, colorClass = "bg-stone-300" }) => (
    <div className="group">
      <div className="flex justify-between items-end mb-1">
        <span className="text-[10px] font-bold uppercase tracking-tighter text-stone-400 group-hover:text-stone-600 transition-colors">
          {label}
        </span>
        <span className="text-[10px] font-black text-stone-800">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-700 ease-out`} 
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-8 bg-[#F9F7F2] min-h-screen font-sans">
      {/* 1. Header & Filters */}
      <header className="mb-12">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-3xl font-light text-zinc-400">QC</span>
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 uppercase italic">Calibration</h1>
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400">Sensory Analysis & Quality Mapping</p>
      </header>

      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200/60 flex flex-wrap gap-8 items-center mb-12">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">Farm Name</label>
          <select 
            className="w-full bg-stone-50 border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-stone-200"
            value={filters.farmName}
            onChange={(e) => handleFilterChange('farmName', e.target.value)}
          >
            <option value="">All Farms</option>
            {options.farms.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">Lead Cupper</label>
          <select 
            className="w-full bg-stone-50 border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-stone-200"
            value={filters.cupperName}
            onChange={(e) => handleFilterChange('cupperName', e.target.value)}
          >
            <option value="">All Cuppers</option>
            {options.cuppers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">Lot Identifier</label>
          <select 
            className="w-full bg-stone-50 border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-stone-200"
            value={filters.lotPublicId}
            onChange={(e) => handleFilterChange('lotPublicId', e.target.value)}
          >
            <option value="">All Lots</option>
            {options.lots.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        
        <button 
           onClick={() => setFilters({ farmName: '', cupperName: '', lotPublicId: '' })}
           className="text-[10px] font-black uppercase tracking-widest text-stone-300 hover:text-stone-900 transition-colors pt-6"
        >
          Reset Filters
        </button>
      </div>

      {/* 2. Calibration Cards Grid */}
      <div className="grid grid-cols-1 gap-10 max-w-4xl">
        {results.map((report) => (
          <div key={report.id} className="bg-white rounded-[2.5rem] shadow-xl shadow-stone-200/50 border border-stone-100 overflow-hidden flex flex-col md:flex-row min-h-[450px]">
            
            {/* Left Sidebar: Lot Identity */}
            <div className="w-full md:w-56 p-10 flex flex-col justify-between border-r border-stone-50">
              <div>
                <div className="flex items-center gap-2 mb-6">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Verified Analysis</span>
                </div>
                <h2 className="text-4xl font-black tracking-tighter text-zinc-900 mb-1 italic">{report.lot_code}</h2>
                <p className="text-emerald-600 font-bold text-sm mb-10">{report.farm_name}</p>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Variety</p>
                    <p className="text-xs font-bold text-stone-800">{report.variety}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Process</p>
                    <p className="text-xs font-bold text-stone-800">{report.process_method}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Analyst</p>
                    <p className="text-xs font-bold text-stone-800">{report.cupper_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-300 block mb-1">Total Score</span>
                <span className="text-4xl font-black text-emerald-500">{report.total_score}</span>
              </div>
            </div>
            
            {/* Right Panel: Sensory Profile */}
            <div className="flex-1 p-10 bg-white">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-900">Sensory Profile</h3>
                <div className="flex gap-1">
                   {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-stone-200"></div>)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-y-4">
                <AttributeBar label="Fragrance/Aroma" value={report.score_fragrance} colorClass="bg-orange-200" />
                <AttributeBar label="Flavor" value={report.score_flavor} colorClass="bg-yellow-200" />
                <AttributeBar label="Aftertaste" value={report.score_aftertaste} colorClass="bg-stone-300" />
                <AttributeBar label="Acidity" value={report.score_acidity} colorClass="bg-teal-200" />
                <AttributeBar label="Body" value={report.score_body} colorClass="bg-amber-900/40" />
                <AttributeBar label="Balance" value={report.score_balance} colorClass="bg-emerald-200" />
                <AttributeBar label="Uniformity" value={report.score_uniformity} colorClass="bg-blue-100" />
                <AttributeBar label="Clean Cup" value={report.score_clean_cup} colorClass="bg-sky-100" />
                <AttributeBar label="Sweetness" value={report.score_sweetness} colorClass="bg-pink-100" />
                <AttributeBar label="Overall" value={report.score_overall} colorClass="bg-zinc-800" />
              </div>

              {report.notes && (
                <div className="mt-10 p-6 bg-stone-50 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Notes</p>
                  <p className="text-xs text-stone-600 leading-relaxed italic">"{report.notes}"</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QCReports;