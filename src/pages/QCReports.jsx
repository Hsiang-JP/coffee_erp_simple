import React from 'react';
import { useCuppingFilters } from '../hooks/useCuppingFilters';
import { useTranslation } from 'react-i18next';

const QCReports = () => {
  const { t } = useTranslation();
  const { filters, setFilters, results, options } = useCuppingFilters();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 🍫 Premium Dark-Mode Color-coding for flavor categories
  const getNoteColor = (note) => {
    const n = note.toLowerCase();
    if (n.includes('chocolate') || n.includes('nut') || n.includes('caramel')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (n.includes('berry') || n.includes('fruit') || n.includes('citrus')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (n.includes('floral') || n.includes('jasmine')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (n.includes('spice') || n.includes('herbal')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return 'bg-stone-500/10 text-stone-400 border-stone-500/20';
  };

  const AttributeBar = React.memo(({ label, value, colorClass = "bg-stone-300" }) => (
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
  ));

  return (
    <div className="max-w-6xl mx-auto p-8 bg-[#F9F7F2] min-h-screen font-sans">
      {/* 1. Header */}
      <header className="mb-12">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-3xl font-light text-zinc-400">{t('qc.title')}</span>
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 uppercase italic">{t('qc.titleBold')}</h1>
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400">{t('qc.subtitle')}</p>
      </header>

      {/* 2. Filters Section */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-200/60 flex flex-wrap gap-8 items-center mb-12">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">{t('qc.farmName')}</label>
          <select 
            className="w-full bg-stone-50 border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-stone-200"
            value={filters.farmName || ''}
            onChange={(e) => handleFilterChange('farmName', e.target.value)}
          >
            <option value="">{t('qc.allFarms')}</option>
            {options.farms.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">{t('qc.leadCupper')}</label>
          <select 
            className="w-full bg-stone-50 border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-stone-200"
            value={filters.cupperName || ''}
            onChange={(e) => handleFilterChange('cupperName', e.target.value)}
          >
            <option value="">{t('qc.allCuppers')}</option>
            {options.cuppers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">{t('qc.lotIdentifier')}</label>
          <select 
            className="w-full bg-stone-50 border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-stone-200"
            value={filters.lotPublicId || ''}
            onChange={(e) => handleFilterChange('lotPublicId', e.target.value)}
          >
            <option value="">{t('qc.allLots')}</option>
            {options.lots.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        
        <button 
            onClick={() => setFilters({ farmName: '', cupperName: '', lotPublicId: '' })}
            className="text-[10px] font-black uppercase tracking-widest text-stone-300 hover:text-stone-900 transition-colors pt-6"
        >
          {t('qc.resetFilters')}
        </button>
      </div>

      {/* 3. Calibration Cards Grid */}
      <div className="grid grid-cols-1 gap-10 max-w-4xl">
        {results.map((report) => (
          <div key={report.id} className="bg-white rounded-[2.5rem] shadow-xl shadow-stone-200/50 border border-stone-100 overflow-hidden flex flex-col md:flex-row min-h-[450px]">
            
            {/* 🌑 Left Sidebar: PREMIUM DARK IDENTITY CARD */}
            <div className="w-full md:w-72 p-10 flex flex-col justify-between bg-zinc-950 text-white relative">
              {/* Visual Flair */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

              <div className="relative z-10">
                {/* Header: Verified Tag & Lot ID Badge */}
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t('qc.verified')}</span>
                   </div>
                   <span className="text-[10px] font-mono font-bold text-stone-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                     {report.lot_code}
                   </span>
                </div>

                {/* 1. FARM NAME (Primary Focus) */}
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1">{t('qc.originDetails')}</p>
                <h2 className="text-4xl font-black tracking-tighter text-white mb-2 italic">{report.farm_name}</h2>
                
                {/* 2. CUPPER NAME */}
                <p className="text-sm font-bold text-emerald-400 mb-8 flex items-center gap-2">
                  {t('qc.analyzedBy')}: {report.cupper_name || t('qc.systemAnalyst')}
                </p>
                
                {/* 🏷️ FLAVOR NOTE BADGES */}
                <div className="mb-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-3">{t('qc.flavorNotes')}</p>
                  <div className="flex flex-wrap gap-2">
                    {(report.primary_flavor_note || 'Clean').split(',').map((note, i) => (
                      <span 
                        key={i} 
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tighter ${getNoteColor(note.trim())}`}
                      >
                        {note.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3, 4, 5, 6. METADATA GRID */}
                <div className="grid grid-cols-2 gap-y-5 gap-x-4 border-t border-zinc-800 pt-6">
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-stone-500 block mb-1">{t('allocation.variety')}</span>
                    <span className="text-xs font-bold text-stone-300">{report.variety || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-stone-500 block mb-1">{t('qc.process')}</span>
                    <span className="text-xs font-bold text-stone-300">{report.process_method || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-stone-500 block mb-1">{t('qc.harvestDate')}</span>
                    <span className="text-xs font-bold text-stone-300">{report.harvest_date || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-stone-500 block mb-1">{t('qc.cuppingDate')}</span>
                    <span className="text-xs font-bold text-stone-300">{report.cupping_date || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              {/* TOTAL SCORE */}
              <div className="mt-8 pt-8 border-t border-zinc-800 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-1">{t('qc.finalTotalScore')}</span>
                <span className="text-6xl font-black text-emerald-400 tracking-tighter">{report.final_score}</span>
              </div>
            </div>
            
            {/* ☀️ Right Panel: SENSORY PROFILE (Kept bright for contrast) */}
            <div className="flex-1 p-10 bg-white">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-900">{t('qc.sensoryProfile')}</h3>
                <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-stone-200"></div>)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-y-4">
                <AttributeBar label={t('qc.fragrance')} value={report.score_fragrance} colorClass="bg-orange-200" />
                <AttributeBar label={t('qc.flavor')} value={report.score_flavor} colorClass="bg-yellow-200" />
                <AttributeBar label={t('qc.aftertaste')} value={report.score_aftertaste} colorClass="bg-stone-300" />
                <AttributeBar label={t('qc.acidity')} value={report.score_acidity} colorClass="bg-teal-200" />
                <AttributeBar label={t('qc.body')} value={report.score_body} colorClass="bg-amber-900/40" />
                <AttributeBar label={t('qc.balance')} value={report.score_balance} colorClass="bg-emerald-200" />
                <AttributeBar label={t('qc.uniformity')} value={report.score_uniformity} colorClass="bg-blue-100" />
                <AttributeBar label={t('qc.cleanCup')} value={report.score_clean_cup} colorClass="bg-sky-100" />
                <AttributeBar label={t('qc.sweetness')} value={report.score_sweetness} colorClass="bg-pink-100" />
                <AttributeBar label={t('qc.overall')} value={report.score_overall} colorClass="bg-zinc-800" />
              </div>

              {report.notes && (
                <div className="mt-10 p-6 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">{t('qc.technicalObservations')}</p>
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