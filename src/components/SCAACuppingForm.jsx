import React, { useState, useEffect } from 'react';
import { execute } from '../db/dbSetup';
import { useStore } from '../store/store';

const SCAACuppingForm = ({ lots }) => {
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  
  const [formData, setFormData] = useState({
    lot_id: '',
    cupper_name: '',
    fragrance: 8.0,
    flavor: 8.0,
    aftertaste: 8.0,
    acidity: 8.0,
    body: 8.0,
    balance: 8.0,
    overall: 8.0,
    acidity_intensity: 5,
    body_level: 5,
    uniformity_cups: [1, 1, 1, 1, 1],
    clean_cup_cups: [1, 1, 1, 1, 1],
    sweetness_cups: [1, 1, 1, 1, 1],
    defect_type: 'None',
    defect_cups: 0,
    notes: '',
    primary_flavor_note: ''
  });

  const [scores, setScores] = useState({
    total: 0,
    final: 0
  });

  useEffect(() => {
    // Agent 3: Real-time scoring math
    const checkboxScore = (arr) => arr.filter(v => v === 1).length * 2;
    
    const baseSum = 
        parseFloat(formData.fragrance) + 
        parseFloat(formData.flavor) + 
        parseFloat(formData.aftertaste) + 
        parseFloat(formData.acidity) + 
        parseFloat(formData.body) + 
        parseFloat(formData.balance) + 
        parseFloat(formData.overall);
    
    const uniformity = checkboxScore(formData.uniformity_cups);
    const cleanCup = checkboxScore(formData.clean_cup_cups);
    const sweetness = checkboxScore(formData.sweetness_cups);
    
    const totalScore = baseSum + uniformity + cleanCup + sweetness;
    const defectSubtract = formData.defect_cups * (formData.defect_type === 'Taint' ? 2 : formData.defect_type === 'Fault' ? 4 : 0);
    
    setScores({
        total: totalScore,
        final: totalScore - defectSubtract
    });
  }, [formData]);

  const toggleCup = (field, index) => {
    const newCups = [...formData[field]];
    newCups[index] = newCups[index] === 1 ? 0 : 1;
    setFormData({ ...formData, [field]: newCups });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lot_id) return alert("Select a Lot");

    const id = `qc-${Date.now()}`;
    const publicId = `QC-${String(Date.now()).slice(-4)}`;

    try {
        await execute(`
            INSERT INTO cupping_sessions (
                id, public_id, lot_id, cupper_name, total_score, final_score, 
                score_acidity, score_body, score_balance, score_overall,
                uniformity_cups, clean_cup_cups, sweetness_cups,
                defect_type, defect_cups, primary_flavor_note, notes, cupping_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, publicId, formData.lot_id, formData.cupper_name, scores.total, scores.final,
            formData.acidity, formData.body, formData.balance, formData.overall,
            formData.uniformity_cups.join(','), formData.clean_cup_cups.join(','), formData.sweetness_cups.join(','),
            formData.defect_type, formData.defect_cups, formData.primary_flavor_note, formData.notes,
            new Date().toISOString().split('T')[0]
        ]);
        alert(`Saved QC Report: ${publicId}. Final Score: ${scores.final}`);
        triggerRefresh();
    } catch (err) {
        alert(err.message);
    }
  };

  const Slider = ({ label, field }) => (
    <div className="space-y-1">
        <div className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">{label}</label>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded">{formData[field]}</span>
        </div>
        <input 
            type="range" min="0" max="10" step="0.25"
            className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            value={formData[field]}
            onChange={(e) => setFormData({...formData, [field]: e.target.value})}
        />
    </div>
  );

  const CupSelector = ({ label, field }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-stone-500 tracking-wider">{label}</label>
        <div className="flex gap-2">
            {formData[field].map((val, i) => (
                <button
                    key={i} type="button"
                    onClick={() => toggleCup(field, i)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        val === 1 ? 'bg-emerald-600 border-emerald-700 text-white shadow-inner' : 'bg-white border-stone-200 text-stone-300'
                    }`}
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>
                </button>
            ))}
        </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-2xl border border-stone-200 shadow-xl space-y-8 max-w-4xl mx-auto">
        
        {/* Header / Big Score */}
        <div className="flex justify-between items-center bg-stone-900 -m-6 mb-6 p-6 rounded-t-2xl text-white">
            <div>
                <h2 className="text-xl font-bold tracking-tighter uppercase italic">SCAA Quality Control</h2>
                <p className="text-stone-400 text-xs font-mono uppercase">Official Calibration Scorecard</p>
            </div>
            <div className="text-right">
                <div className="text-5xl font-black text-emerald-400 leading-none">{scores.final.toFixed(2)}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mt-1">Final Score</div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-stone-500 mb-1">Select Lot</label>
                        <select 
                            className="w-full bg-stone-50 border-stone-200 rounded-lg text-sm p-2 focus:ring-emerald-500"
                            value={formData.lot_id}
                            onChange={(e) => setFormData({...formData, lot_id: e.target.value})}
                        >
                            <option value="">-- Choose Lot --</option>
                            {lots.map(l => <option key={l.id} value={l.id}>{l.public_id} - {l.variety}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-stone-500 mb-1">Cupper Name</label>
                        <input 
                            type="text" className="w-full bg-stone-50 border-stone-200 rounded-lg text-sm p-2"
                            placeholder="John Doe"
                            value={formData.cupper_name}
                            onChange={(e) => setFormData({...formData, cupper_name: e.target.value})}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <Slider label="Fragrance / Aroma" field="fragrance" />
                    <Slider label="Flavor" field="flavor" />
                    <Slider label="Aftertaste" field="aftertaste" />
                    <Slider label="Acidity" field="acidity" />
                    <Slider label="Body" field="body" />
                    <Slider label="Balance" field="balance" />
                    <Slider label="Overall" field="overall" />
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-6">
                    <CupSelector label="Uniformity" field="uniformity_cups" />
                    <CupSelector label="Clean Cup" field="clean_cup_cups" />
                    <CupSelector label="Sweetness" field="sweetness_cups" />
                </div>

                <div className="grid grid-cols-2 gap-4 bg-red-50/30 p-4 rounded-xl border border-red-100">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-red-800 mb-1">Defect Type</label>
                        <select 
                            className="w-full bg-white border-red-200 rounded-lg text-xs p-2"
                            value={formData.defect_type}
                            onChange={(e) => setFormData({...formData, defect_type: e.target.value})}
                        >
                            <option value="None">None</option>
                            <option value="Taint">Taint (-2)</option>
                            <option value="Fault">Fault (-4)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-red-800 mb-1">Defect Cups</label>
                        <input 
                            type="number" min="0" max="5"
                            className="w-full bg-white border-red-200 rounded-lg text-xs p-2"
                            value={formData.defect_cups}
                            onChange={(e) => setFormData({...formData, defect_cups: parseInt(e.target.value) || 0})}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <input 
                        type="text" placeholder="Primary Flavor Note (e.g. Jasmine)"
                        className="w-full border-stone-200 rounded-lg text-sm p-3 shadow-sm"
                        value={formData.primary_flavor_note}
                        onChange={(e) => setFormData({...formData, primary_flavor_note: e.target.value})}
                    />
                    <textarea 
                        placeholder="Detailed Cupping Notes..."
                        className="w-full h-24 border-stone-200 rounded-lg text-sm p-3 shadow-sm"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                </div>
            </div>
        </div>

        <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
        >
            Authorize & Store QC Calibration
        </button>
    </form>
  );
};

export default SCAACuppingForm;
