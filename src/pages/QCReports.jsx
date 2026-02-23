import React from 'react';
import { useCuppingFilters } from '../hooks/useCuppingFilters';

const QCReports = () => {
  const { filters, setFilters, results, options } = useCuppingFilters();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label>
          <select 
            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md"
            value={filters.farmName}
            onChange={(e) => handleFilterChange('farmName', e.target.value)}
          >
            <option value="">All Farms</option>
            {options.farms.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cupper</label>
          <select 
            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md"
            value={filters.cupperName}
            onChange={(e) => handleFilterChange('cupperName', e.target.value)}
          >
            <option value="">All Cuppers</option>
            {options.cuppers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lot ID</label>
          <select 
            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md"
            value={filters.lotPublicId}
            onChange={(e) => handleFilterChange('lotPublicId', e.target.value)}
          >
            <option value="">All Lots</option>
            {options.lots.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        
        <button 
           onClick={() => setFilters({ farmName: '', cupperName: '', lotPublicId: '' })}
           className="text-sm text-gray-500 hover:text-emerald-600 underline pb-2"
        >
          Clear Filters
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
        {results.map((report) => (
          <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-stone-50 p-4 border-b border-gray-100 flex justify-between items-center">
               <div>
                  <h3 className="text-lg font-bold text-gray-900">{report.lot_code}</h3>
                  <p className="text-xs text-gray-500">{report.farm_name}</p>
               </div>
               <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-lg font-bold">
                  {report.total_score}
               </div>
            </div>
            
            <div className="p-4 space-y-3">
               <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Variety</span>
                  <span className="font-medium text-gray-900">{report.variety}</span>
               </div>
               <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Process</span>
                  <span className="font-medium text-gray-900">{report.process_method}</span>
               </div>
               <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cupper</span>
                  <span className="font-medium text-gray-900">{report.cupper_name}</span>
               </div>
               
               <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-sm italic text-gray-800">"{report.notes}"</p>
               </div>
               
               <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
                  <div className="bg-gray-50 p-1 rounded">
                     <span className="block text-gray-400">Acid</span>
                     <span className="font-bold">{report.score_acidity}</span>
                  </div>
                  <div className="bg-gray-50 p-1 rounded">
                     <span className="block text-gray-400">Body</span>
                     <span className="font-bold">{report.score_body}</span>
                  </div>
                  <div className="bg-gray-50 p-1 rounded">
                     <span className="block text-gray-400">Bal</span>
                     <span className="font-bold">{report.score_balance}</span>
                  </div>
               </div>
            </div>
          </div>
        ))}
        
        {results.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            No cupping reports found matching these criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default QCReports;
