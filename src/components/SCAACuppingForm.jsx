import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/store';
import { execute } from '../db/dbSetup';
import gsap from 'gsap';

// --- Helper Components ---
const Slider = ({ label, name, value, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">{label}</label>
      <span className="text-sm font-black text-emerald-600">{value}</span>
    </div>
    <input type="range" min="6" max="10" step="0.25" name={name} value={value} 
      onChange={onChange}
      className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-zinc-900" />
  </div>
);

const CupGrid = ({ label, field, cups, toggleCup }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">{label}</label>
    <div className="flex gap-2">
      {cups.split(',').map((val, i) => (
        <button key={i} type="button" onClick={() => toggleCup(field, i)}
          className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all 
          ${val === '1' ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg' : 'bg-stone-50 border-stone-100 text-stone-300'}`}>
          ☕
        </button>
      ))}
    </div>
  </div>
);

const SCAACuppingForm = () => {
  const { lots, triggerRefresh } = useStore();
  
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

  // --- Real-Time Math (Agent 3 Logic) ---
  const scores = useMemo(() => {
    const calcCups = (str) => str.split(',').filter(c => c === '1').length * 2;
    const uniScore = calcCups(formData.uniformity_cups);
    const cleanScore = calcCups(formData.clean_cup_cups);
    const sweetScore = calcCups(formData.sweetness_cups);
    
    const defectSub = formData.defect_cups * (formData.defect_type === 'Taint' ? 2 : formData.defect_type === 'Fault' ? 4 : 0);
    
    const total = 
      parseFloat(formData.score_fragrance) + parseFloat(formData.score_flavor) + 
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
    if (!formData.lot_id) return alert("Please select a lot.");

    await execute(`
      INSERT INTO cupping_sessions (
        id, public_id, lot_id, cupper_name, cupping_date,
        score_fragrance, score_flavor, score_aftertaste, score_acidity,
        score_body, score_balance, score_overall, 
        uniformity_cups, score_uniformity, 
        clean_cup_cups, score_clean_cup, 
        sweetness_cups, score_sweetness,
        defect_type, defect_cups, defect_score_subtract,
        total_score, final_score, notes, primary_flavor_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `cup-${Date.now()}`, `QC-${String(Date.now()).slice(-4)}`, formData.lot_id, formData.cupper_name, formData.cupping_date,
      formData.score_fragrance, formData.score_flavor, formData.score_aftertaste, formData.score_acidity,
      formData.score_body, formData.score_balance, formData.score_overall,
      formData.uniformity_cups, scores.uniScore,
      formData.clean_cup_cups, scores.cleanScore,
      formData.sweetness_cups, scores.sweetScore,
      formData.defect_type, formData.defect_cups, scores.defectSub,
      scores.total, scores.final, formData.notes, formData.primary_flavor_note
    ]);

    alert("Successful: Scoresheet Synchronized.");
    triggerRefresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-10 bg-white rounded-[3rem] shadow-2xl border border-stone-100 font-sans text-zinc-900">
      {/* Header with Prominent Final Score */}
      <div className="flex justify-between items-start mb-12 border-b border-stone-50 pb-8">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase italic">SCAA <span className="text-zinc-400">Scoresheet</span></h2>
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-stone-400 mt-2">Professional Sensory Calibration</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-300 block">Final Score</span>
          <span className="text-7xl font-black text-emerald-500 leading-none">{scores.final.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left Column: Sliders & Main Attributes */}
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
          
          <div className="pt-8 border-t border-stone-50 space-y-4">
             <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Analyst Details</label>
             <select name="lot_id" value={formData.lot_id} onChange={e => setFormData({...formData, lot_id: e.target.value})} className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold">
               <option value="">Select Lot to Authenticate</option>
               {lots.map(l => <option key={l.id} value={l.id}>{l.public_id} - {l.farm_name}</option>)}
             </select>
             <input type="text" placeholder="Cupper Name" value={formData.cupper_name} onChange={e => setFormData({...formData, cupper_name: e.target.value})} className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold" />
          </div>
        </div>

        {/* Right Column: 5 Cups & Defects */}
        <div className="space-y-10">
          <CupGrid label="Uniformity (2 pts / cup)" field="uniformity_cups" cups={formData.uniformity_cups} toggleCup={toggleCup} />
          <CupGrid label="Clean Cup (2 pts / cup)" field="clean_cup_cups" cups={formData.clean_cup_cups} toggleCup={toggleCup} />
          <CupGrid label="Sweetness (2 pts / cup)" field="sweetness_cups" cups={formData.sweetness_cups} toggleCup={toggleCup} />

          <div className="p-8 bg-red-50 rounded-[2rem] border border-red-100">
            <label className="text-[10px] font-black uppercase tracking-widest text-red-400 block mb-4">Defect Tracking</label>
            <div className="flex gap-4">
              <select value={formData.defect_type} onChange={e => setFormData({...formData, defect_type: e.target.value})} className="flex-1 bg-white border-none rounded-xl p-3 text-sm font-bold text-red-600">
                <option value="None">No Defects</option>
                <option value="Taint">Taint (-2)</option>
                <option value="Fault">Fault (-4)</option>
              </select>
              <input type="number" min="0" max="5" value={formData.defect_cups} onChange={e => setFormData({...formData, defect_cups: parseInt(e.target.value)})} 
                className="w-20 bg-white border-none rounded-xl p-3 text-center font-black text-red-600" />
            </div>
            {scores.defectSub > 0 && <p className="text-[10px] font-bold text-red-400 mt-3 uppercase tracking-widest">Total Deduction: -{scores.defectSub} Points</p>}
          </div>

          <div className="space-y-4">
            <input type="text" placeholder="Primary Flavor Note (e.g. Bergamot)" value={formData.primary_flavor_note} onChange={e => setFormData({...formData, primary_flavor_note: e.target.value})} className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-medium" />
            <textarea placeholder="Technical Cupping Notes..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm h-32" />
          </div>
        </div>
      </div>

      <button type="submit" className="w-full mt-12 bg-zinc-900 text-white p-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.5em] hover:bg-black transition-all shadow-xl shadow-stone-200">
        Authenticate & Save Analysis
      </button>
    </form>
  );
};

export default SCAACuppingForm;