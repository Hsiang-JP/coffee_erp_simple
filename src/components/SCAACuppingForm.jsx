import React, { useState, useMemo } from 'react';
import { useStore } from '../store/store';
import { createCuppingSession } from '../db/services/cuppingService';

// --- Internal Combobox Component ---
const Combobox = ({ options, value, onChange, onAdd, label, placeholder }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.find(opt => 
    opt.name.toLowerCase() === search.toLowerCase()
  );

  return (
    <div className="relative">
      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">
        {label}
      </label>
      <input 
        type="text"
        placeholder={placeholder}
        value={isOpen ? search : (options.find(o => o.id === value)?.name || search || value)}
        onFocus={() => { setIsOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-stone-50 border border-stone-100 rounded-xl p-4 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
      />
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-stone-100 rounded-2xl shadow-xl z-50 max-h-40 overflow-y-auto p-2">
          {filtered.map(opt => (
            <div key={opt.id} className="p-3 hover:bg-emerald-50 rounded-xl cursor-pointer text-sm font-medium transition-colors"
              onClick={() => { onChange(opt.id); setIsOpen(false); setSearch(opt.name); }}>
              {opt.name}
            </div>
          ))}
          {!exactMatch && search.length > 0 && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl cursor-pointer text-sm font-black uppercase tracking-wider border border-emerald-100"
              onClick={() => { onAdd(search); setIsOpen(false); }}>
              + Add "{search}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---
const Slider = ({ label, name, value, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">{label}</label>
      <span className="text-sm font-black text-emerald-600">{value}</span>
    </div>
    <input type="range" min="6" max="10" step="0.25" name={name} value={value} 
      onChange={onChange}
      className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-zinc-900 transition-all hover:bg-stone-200" />
  </div>
);

const CupGrid = ({ label, field, cups, toggleCup }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">{label}</label>
    <div className="flex gap-2">
      {cups.split(',').map((val, i) => (
        <button key={i} type="button" onClick={() => toggleCup(field, i)}
          className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all 
          ${val === '1' ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg scale-105' : 'bg-stone-50 border-stone-100 text-stone-300 hover:bg-stone-100'}`}>
          ☕
        </button>
      ))}
    </div>
  </div>
);

const SCAACuppingForm = React.memo(() => {
  const { lots, farms, cuppingReports, triggerRefresh } = useStore(); 
  
  const [formData, setFormData] = useState({
    lot_id: '',
    cupper_name: '',
    cupping_date: new Date().toISOString().split('T')[0],
    score_fragrance: 8.0,
    score_flavor: 8.0,
    score_aftertaste: 8.0,
    score_acidity: 8.0,
    score_body: 8.0,
    score_balance: 8.0,
    score_overall: 8.0,
    uniformity_cups: '1,1,1,1,1',
    clean_cup_cups: '1,1,1,1,1',
    sweetness_cups: '1,1,1,1,1',
    defect_type: 'None',
    defect_cups: 0,
    notes: '',
    primary_flavor_note: ''
  });

  const cupperOptions = useMemo(() => {
    const existingNames = [...new Set((cuppingReports || []).map(report => report.cupper_name))];
    return existingNames.filter(Boolean).sort().map(name => ({ id: name, name: name }));
  }, [cuppingReports]);

  // 🛠️ FIX FOR THE BROKEN IMAGE LABELS
  const lotOptions = useMemo(() => {
    return lots.map(lot => {
      const farm = farms.find(f => f.id === lot.farm_id);
      const farmName = farm?.name || lot.farm_name || 'Unknown Farm';
      const variety = lot.variety || 'Unknown Variety';
      return {
        id: lot.id,
        label: `${lot.public_id} — ${farmName} (${variety})`
      };
    });
  }, [lots, farms]);

  // --- NEW: Derive selected lot details for the UI Card ---
  const selectedLotDetails = useMemo(() => {
    if (!formData.lot_id) return null;
    const lot = lots.find(l => l.id === formData.lot_id);
    if (!lot) return null;
    const farm = farms.find(f => f.id === lot.farm_id);
    return { ...lot, farm_name: farm?.name || 'Unknown Farm' };
  }, [formData.lot_id, lots, farms]);

  const scores = useMemo(() => {
    const calcCups = (str) => str.split(',').filter(c => c === '1').length * 2;
    const uniScore = calcCups(formData.uniformity_cups);
    const cleanScore = calcCups(formData.clean_cup_cups);
    const sweetScore = calcCups(formData.sweetness_cups);
    const defectSub = formData.defect_cups * (formData.defect_type === 'Taint' ? 2 : formData.defect_type === 'Fault' ? 4 : 0);
    const total = parseFloat(formData.score_fragrance) + parseFloat(formData.score_flavor) + 
                  parseFloat(formData.score_aftertaste) + parseFloat(formData.score_acidity) + 
                  parseFloat(formData.score_body) + parseFloat(formData.score_balance) + 
                  parseFloat(formData.score_overall) + uniScore + cleanScore + sweetScore;
    return { total, final: total - defectSub, defectSub, uniScore, cleanScore, sweetScore };
  }, [formData]);

  const toggleCup = (field, index) => {
    const cups = formData[field].split(',');
    cups[index] = cups[index] === '1' ? '0' : '1';
    setFormData({ ...formData, [field]: cups.join(',') });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cupper_name) return alert("Cupper Name is required.");
    if (!formData.lot_id) return alert("Please select a lot.");

    await createCuppingSession({
      ...formData,
      id: `cup-${Date.now()}`,
      public_id: `QC-${String(Date.now()).slice(-4)}`,
      score_uniformity: scores.uniScore,
      score_clean_cup: scores.cleanScore,
      score_sweetness: scores.sweetScore,
      defect_score_subtract: scores.defectSub,
      total_score: scores.total,
      final_score: scores.final
    });

    alert("Successful: Scoresheet Synchronized.");
    triggerRefresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-10 bg-white rounded-[3rem] shadow-2xl border border-stone-100 text-zinc-900">
      <div className="flex justify-between items-start mb-12 border-b border-stone-50 pb-8">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase">SCAA <span className="text-zinc-400">Scoresheet</span></h2>
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-400 mt-2">Sensory Calibration</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-300 block">Final Score</span>
          <span className="text-7xl font-black text-emerald-500 leading-none">{scores.final.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <Slider label="Fragrance" name="score_fragrance" value={formData.score_fragrance} onChange={e => setFormData({...formData, score_fragrance: e.target.value})} />
            <Slider label="Flavor" name="score_flavor" value={formData.score_flavor} onChange={e => setFormData({...formData, score_flavor: e.target.value})} />
            <Slider label="Aftertaste" name="score_aftertaste" value={formData.score_aftertaste} onChange={e => setFormData({...formData, score_aftertaste: e.target.value})} />
            <Slider label="Acidity" name="score_acidity" value={formData.score_acidity} onChange={e => setFormData({...formData, score_acidity: e.target.value})} />
            <Slider label="Body" name="score_body" value={formData.score_body} onChange={e => setFormData({...formData, score_body: e.target.value})} />
            <Slider label="Balance" name="score_balance" value={formData.score_balance} onChange={e => setFormData({...formData, score_balance: e.target.value})} />
            <div className="col-span-2"><Slider label="Overall" name="score_overall" value={formData.score_overall} onChange={e => setFormData({...formData, score_overall: e.target.value})} /></div>
          </div>
          
          <div className="pt-8 border-t border-stone-100 space-y-6">
            {/* 1. Cupper Name Moved to Top */}
            <Combobox 
              label="Lead Analyst / Cupper Name *" 
              placeholder="Search or add cupper..." 
              options={cupperOptions} 
              value={formData.cupper_name}
              onChange={name => setFormData({...formData, cupper_name: name})} 
              onAdd={name => setFormData({...formData, cupper_name: name})} 
            />

            {/* 2. Lot Selection Moved Below */}
            <div>
               <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Sample Lot Selection *</label>
               <select 
                 value={formData.lot_id} 
                 onChange={e => setFormData({...formData, lot_id: e.target.value})} 
                 className="w-full bg-stone-50 border border-stone-100 rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
               >
                 <option value="">Select Lot</option>
                 {lotOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
               </select>
            </div>

            {/* 3. DYNAMIC CONTEXT CARD */}
            {selectedLotDetails && (
              <div className="relative mt-6 p-6 bg-zinc-950 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                
                {/* 1. Farm (Highest Importance) */}
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1">Origin Details</p>
                <h4 className="text-2xl font-black text-white italic mb-1">{selectedLotDetails.farm_name}</h4>
                
                {/* 2. Cupper Name (Live Reflection) */}
                <p className="text-sm font-bold text-emerald-400 mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Analyzed by: {formData.cupper_name || 'Pending Analyst...'}
                </p>

                {/* Grid for remaining details */}
                <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                  {/* 3. Variety */}
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-stone-500 block mb-0.5">Variety</span>
                    <span className="text-xs font-bold text-stone-300">{selectedLotDetails.variety || 'N/A'}</span>
                  </div>
                  {/* 4. Process */}
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-stone-500 block mb-0.5">Process</span>
                    <span className="text-xs font-bold text-stone-300">{selectedLotDetails.process_method || 'N/A'}</span>
                  </div>
                  {/* 5. Harvest Date */}
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-stone-500 block mb-0.5">Harvest Date</span>
                    <span className="text-xs font-bold text-stone-300">{selectedLotDetails.harvest_date || 'N/A'}</span>
                  </div>
                  {/* 6. Cupping Date */}
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-stone-500 block mb-0.5">Cupping Date</span>
                    <span className="text-xs font-bold text-stone-300">{formData.cupping_date}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-10">
          <CupGrid label="Uniformity" field="uniformity_cups" cups={formData.uniformity_cups} toggleCup={toggleCup} />
          <CupGrid label="Clean Cup" field="clean_cup_cups" cups={formData.clean_cup_cups} toggleCup={toggleCup} />
          <CupGrid label="Sweetness" field="sweetness_cups" cups={formData.sweetness_cups} toggleCup={toggleCup} />
          <div className="p-8 bg-red-50 rounded-[2rem] border border-red-100">
            <div className="flex gap-4">
              <select value={formData.defect_type} onChange={e => setFormData({...formData, defect_type: e.target.value})} className="flex-1 bg-white border-none rounded-xl p-3 text-sm font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-200">
                <option value="None">No Defects</option>
                <option value="Taint">Taint (-2)</option>
                <option value="Fault">Fault (-4)</option>
              </select>
              <input type="number" min="0" max="5" value={formData.defect_cups} onChange={e => setFormData({...formData, defect_cups: parseInt(e.target.value)})} 
                className="w-20 bg-white border-none rounded-xl p-3 text-center font-black text-red-600 outline-none focus:ring-2 focus:ring-red-200" />
            </div>
          </div>
        </div>
      </div>
      <button type="submit" className="w-full mt-12 bg-zinc-900 text-white p-6 rounded-2xl font-black uppercase tracking-[0.5em] hover:bg-black transition-all shadow-xl shadow-stone-200 active:scale-[0.99]">
        Authenticate & Save Analysis
      </button>
    </form>
  );
});

export default SCAACuppingForm;