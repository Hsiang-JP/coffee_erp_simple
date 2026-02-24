import React, { useState } from 'react';
import { useCuppingFilters, CuppingFilters } from '../hooks/useCuppingFilters';
import { VwCuppingDetails } from '../types/database';

/**
 * Sensory Attribute Definitions for Tooltips & Visualization
 */
interface ScaaAttribute {
  key: keyof VwCuppingDetails;
  label: string;
  color: string;
  text: string;
  desc: string;
}

const SCAA_ATTRIBUTES: ScaaAttribute[] = [
  { key: 'score_fragrance', label: 'Fragrance/Aroma', color: 'bg-orange-200', text: 'text-orange-900', desc: 'The smell of the roasted grounds (dry) and the coffee after infusion (wet).' },
  { key: 'score_flavor', label: 'Flavor', color: 'bg-amber-200', text: 'text-amber-900', desc: 'The combined sensory impact of the taste and aroma.' },
  { key: 'score_aftertaste', label: 'Aftertaste', color: 'bg-stone-200', text: 'text-stone-900', desc: 'The duration of positive flavor qualities emanating from the back of the palate.' },
  { key: 'score_acidity', label: 'Acidity', color: 'bg-yellow-200', text: 'text-yellow-900', desc: 'The brightness or "citrus" quality of the coffee.' },
  { key: 'score_body', label: 'Body', color: 'bg-amber-900', text: 'text-amber-50', desc: 'The tactile feeling of the liquid in the mouth (weight and texture).' },
  { key: 'score_balance', label: 'Balance', color: 'bg-emerald-200', text: 'text-emerald-900', desc: 'How well the flavor, aftertaste, acidity, and body work together.' },
  { key: 'score_uniformity', label: 'Uniformity', color: 'bg-stone-100', text: 'text-stone-600', desc: 'Consistency of flavor between different cups of the same lot.' },
  { key: 'score_clean_cup', label: 'Clean Cup', color: 'bg-sky-100', text: 'text-sky-900', desc: 'Lack of negative interference from the first ingestion to the final aftertaste.' },
  { key: 'score_sweetness', label: 'Sweetness', color: 'bg-red-200', text: 'text-red-900', desc: 'A pleasing fullness of flavor as well as any perceived sweetness.' },
  { key: 'score_overall', label: 'Overall', color: 'bg-zinc-800', text: 'text-zinc-50', desc: 'The holistic "panelist" rating of the coffee lot.' },
];

const QCReports: React.FC = () => {
  const { filters, setFilters, results, options } = useCuppingFilters();
  const [hoveredAttr, setHoveredAttr] = useState<string | null>(null);

  const handleFilterChange = (key: keyof CuppingFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <main className="space-y-10 pb-20">
      {/* Page Header */}
      <div className="border-b border-stone-200 pb-6">
        <h1 id="qc-reports-title" className="text-4xl font-light tracking-tight text-zinc-900 uppercase italic">
          QC <span className="font-black">Calibration</span>
        </h1>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400 font-semibold mt-2">Sensory Analysis & Quality Mapping</p>
      </div>

      {/* Filter Section - Accessible Landmark */}
      <section aria-label="Report Filters" className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 flex flex-wrap gap-6 items-end">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="farm-filter" className="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">Farm Name</label>
          <select 
            id="farm-filter"
            className="w-full bg-stone-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
            value={filters.farmName}
            onChange={(e) => handleFilterChange('farmName', e.target.value)}
            disabled={options.farms.length === 0}
          >
            <option value="">{options.farms.length > 0 ? 'All Farms' : 'No Farms Found...'}</option>
            {options.farms.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label htmlFor="cupper-filter" className="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">Lead Cupper</label>
          <select 
            id="cupper-filter"
            className="w-full bg-stone-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
            value={filters.cupperName}
            onChange={(e) => handleFilterChange('cupperName', e.target.value)}
            disabled={options.cuppers.length === 0}
          >
            <option value="">{options.cuppers.length > 0 ? 'All Cuppers' : 'No Cuppers Found...'}</option>
            {options.cuppers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label htmlFor="lot-filter" className="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">Lot Identifier</label>
          <select 
            id="lot-filter"
            className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
            value={filters.lotPublicId}
            onChange={(e) => handleFilterChange('lotPublicId', e.target.value)}
            disabled={options.lots.length === 0}
          >
            <option value="">{options.lots.length > 0 ? 'All Lots' : 'No Lots Found...'}</option>
            {options.lots.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        
        <button 
           onClick={() => setFilters({ farmName: '', cupperName: '', lotPublicId: '' })}
           className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-emerald-600 transition-colors"
        >
          Reset Filters
        </button>
      </section>

      {/* Results Grid - Bento Box Layout */}
      <section aria-label="Quality Control Reports" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {results.map((report) => (
          <article 
            key={report.id} 
            className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 grid grid-cols-1 md:grid-cols-12"
          >
            {/* Left Column: Metadata (Bento Section 1) */}
            <div className="md:col-span-5 p-8 bg-stone-50/50 flex flex-col justify-between border-r border-stone-100">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true"></span>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Verified Analysis</p>
                </div>
                <h3 className="text-3xl font-black text-zinc-900 tracking-tighter mb-1 uppercase italic">{report.lot_public_id}</h3>
                <p className="text-sm font-bold text-emerald-800">{report.farm_name}</p>
                
                <div className="mt-8 space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-widest">Variety</span>
                    <span className="text-xs font-bold text-zinc-800">{report.variety}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-widest">Process</span>
                    <span className="text-xs font-bold text-zinc-800">{report.process_method}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-black text-stone-400 tracking-widest">Analyst</span>
                    <span className="text-xs font-bold text-zinc-800">{report.cupper_name}</span>
                  </div>
                </div>
              </div>

              {/* Total Score Circle Badge */}
              <div className="mt-10 flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shadow-lg ${
                  report.final_score >= 85 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {report.final_score?.toFixed(1) || '0.0'}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-zinc-900 tracking-widest">SCAA Grade</p>
                  {(report.defect_cups ?? 0) > 0 ? (
                    <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter animate-pulse">
                      ⚠️ {report.defect_cups} {report.defect_type}(s) Found
                    </span>
                  ) : (
                    <p className="text-[9px] text-stone-400 font-medium">Specialty Standard</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Sensory Visualization (Bento Section 2) */}
            <div className="md:col-span-7 p-8 flex flex-col gap-6 relative">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] uppercase font-black text-zinc-900 tracking-widest">Sensory Profile</h4>
                <div className="flex gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${(report.defect_cups ?? 0) > 0 ? 'bg-red-400 animate-bounce' : 'bg-stone-200'}`}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-200"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-200"></div>
                </div>
              </div>

              {/* Sensory Bar Grid */}
              <div className="space-y-3">
                {SCAA_ATTRIBUTES.map((attr) => (
                  <div 
                    key={attr.key} 
                    className="relative group"
                    onMouseEnter={() => setHoveredAttr(attr.key)}
                    onMouseLeave={() => setHoveredAttr(null)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-stone-500 uppercase tracking-tighter">{attr.label}</span>
                      <span className="text-[9px] font-mono font-bold text-zinc-900 bg-stone-100 px-1.5 rounded">
                        {report[attr.key] !== null ? (report[attr.key] as number) : 'N/A'}
                      </span>
                    </div>
                    {/* Horizontal Bar Graph - Accessible with Role & Aria-valuenow */}
                    <div 
                      role="progressbar" 
                      aria-valuemin={0} 
                      aria-valuemax={10} 
                      aria-valuenow={(report[attr.key] as number) || 0} 
                      aria-label={`${attr.label}: ${(report[attr.key] as number) || 0} out of 10`}
                      className="w-full h-1.5 bg-stone-50 rounded-full overflow-hidden border border-stone-100"
                    >
                      <div 
                        className={`h-full transition-all duration-1000 ease-out ${attr.color}`}
                        style={{ width: `${((report[attr.key] as number) || 0) * 10}%` }}
                      ></div>
                    </div>

                    {/* Interactive Tooltip (Accessible Description) */}
                    {hoveredAttr === attr.key && (
                      <div className="absolute left-0 -top-12 z-50 bg-zinc-900 text-white p-3 rounded-xl text-[10px] shadow-2xl w-48 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md">
                        <p className="font-bold border-b border-zinc-700 pb-1 mb-1">{attr.label}</p>
                        <p className="opacity-80 leading-relaxed font-light">{attr.desc}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Flavor Tags */}
              <div className="mt-4 pt-6 border-t border-stone-100">
                <p className="text-[9px] uppercase font-black text-stone-400 tracking-[0.2em] mb-3">Flavor Archetype</p>
                <div className="flex flex-wrap gap-2">
                  {report.primary_flavor_note ? (
                    <span className="px-3 py-1.5 bg-rose-50 text-rose-900 text-[10px] font-black rounded-full uppercase tracking-tighter border border-rose-100">
                      {report.primary_flavor_note}
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 bg-stone-100 text-stone-400 text-[10px] font-bold rounded-full uppercase tracking-tighter italic">Pending Analysis</span>
                  )}
                  {report.notes && (
                    <p className="text-[10px] text-stone-500 italic mt-2 line-clamp-2 leading-relaxed">
                      "{report.notes}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
        
        {results.length === 0 && (
          <div className="col-span-full text-center py-24 bg-white rounded-[2rem] border border-dashed border-stone-200">
            <p className="text-sm font-bold text-stone-300 uppercase tracking-[0.3em]">No cupping data found for active filter set</p>
          </div>
        )}
      </section>
    </main>
  );
};

export default QCReports;
