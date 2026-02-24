import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { execute } from '../db/dbSetup';

const SCAACuppingForm = () => {
  const { farms, lots } = useStore();
  const [lotId, setLotId] = useState('');
  const [cupperName, setCupperName] = useState('');
  const [cuppingDate, setCuppingDate] = useState(new Date().toISOString().split('T')[0]);
  const [roastLevel, setRoastLevel] = useState(7.0); // 0-10
  const [fragranceDry, setFragranceDry] = useState(7.0); // 0-10
  const [fragranceBreak, setFragranceBreak] = useState(7.0); // 0-10
  const [scoreFragrance, setScoreFragrance] = useState(0.0);
  const [scoreFlavor, setScoreFlavor] = useState(0.0);
  const [scoreAftertaste, setScoreAftertaste] = useState(0.0);
  const [scoreAcidity, setScoreAcidity] = useState(0.0);
  const [acidityIntensity, setAcidityIntensity] = useState(5); // 1-10 slider
  const [scoreBody, setScoreBody] = useState(0.0);
  const [bodyLevel, setBodyLevel] = useState(5); // 1-10 slider
  const [scoreBalance, setScoreBalance] = useState(0.0);
  const [scoreOverall, setScoreOverall] = useState(0.0);
  
  const [uniformityCups, setUniformityCups] = useState([1, 1, 1, 1, 1]);
  const [cleanCupCups, setCleanCupCups] = useState([1, 1, 1, 1, 1]);
  const [sweetnessCups, setSweetnessCups] = useState([1, 1, 1, 1, 1]);

  const [defectType, setDefectType] = useState('None');
  const [defectCups, setDefectCups] = useState(0);

  const [totalScore, setTotalScore] = useState(0.0);
  const [finalScore, setFinalScore] = useState(0.0);
  const [notes, setNotes] = useState('');
  const [primaryFlavorNote, setPrimaryFlavorNote] = useState('');

  const triggerRefresh = useStore((state) => state.triggerRefresh);

  // --- Real-time Math (Agent 3 & 4) ---
  useEffect(() => {
    // Checkbox Scores
    const scoreUniformity = (uniformityCups.filter(c => c === 1).length * 2.0).toFixed(1);
    const scoreCleanCup = (cleanCupCups.filter(c => c === 1).length * 2.0).toFixed(1);
    const scoreSweetness = (sweetnessCups.filter(c => c === 1).length * 2.0).toFixed(1);

    // Defect Subtract
    const defectScoreSubtract = defectCups * (defectType === 'Taint' ? 2 : (defectType === 'Fault' ? 4 : 0));

    // Total Score
    const currentTotalScore = (
      parseFloat(scoreFragrance) + parseFloat(scoreFlavor) + parseFloat(scoreAftertaste) +
      parseFloat(scoreAcidity) + parseFloat(scoreBody) + parseFloat(scoreBalance) +
      parseFloat(scoreOverall) + parseFloat(scoreUniformity) + parseFloat(scoreCleanCup) + parseFloat(scoreSweetness)
    ).toFixed(1);

    // Final Score
    const currentFinalScore = (parseFloat(currentTotalScore) - defectScoreSubtract).toFixed(1);

    setScoreFragrance(parseFloat(fragranceDry) + parseFloat(fragranceBreak)); // Assuming Fragrance score is sum of Dry and Break
    setTotalScore(parseFloat(currentTotalScore));
    setFinalScore(parseFloat(currentFinalScore));

  }, [
    fragranceDry, fragranceBreak, scoreFlavor, scoreAftertaste, scoreAcidity,
    scoreBody, scoreBalance, scoreOverall, uniformityCups, cleanCupCups, sweetnessCups,
    defectType, defectCups
  ]);

  const handleCupToggle = (arr, setArr, index) => {
    const newArr = [...arr];
    newArr[index] = newArr[index] === 1 ? 0 : 1;
    setArr(newArr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lotId || !cupperName) return;

    const publicId = `CS-${Date.now().toString().slice(-4)}`; // Simple public ID

    await execute(
      `INSERT INTO cupping_sessions (
        id, public_id, lot_id, cupper_name, cupping_date, roast_level,
        fragrance_dry, fragrance_break, score_fragrance, score_flavor, score_aftertaste,
        score_acidity, acidity_intensity, score_body, body_level, score_balance,
        score_overall, uniformity_cups, score_uniformity, clean_cup_cups, score_clean_cup,
        sweetness_cups, score_sweetness, defect_type, defect_cups, defect_score_subtract,
        total_score, final_score, notes, primary_flavor_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `cup-${Date.now()}`, publicId, lotId, cupperName, cuppingDate, parseFloat(roastLevel),
        parseFloat(fragranceDry), parseFloat(fragranceBreak), parseFloat(scoreFragrance), parseFloat(scoreFlavor), parseFloat(scoreAftertaste),
        parseFloat(scoreAcidity), parseFloat(acidityIntensity), parseFloat(scoreBody), parseFloat(bodyLevel), parseFloat(scoreBalance),
        parseFloat(scoreOverall), uniformityCups.join(','), parseFloat((uniformityCups.filter(c => c === 1).length * 2.0).toFixed(1)),
        cleanCupCups.join(','), parseFloat((cleanCupCups.filter(c => c === 1).length * 2.0).toFixed(1)),
        sweetnessCups.join(','), parseFloat((sweetnessCups.filter(c => c === 1).length * 2.0).toFixed(1)),
        defectType, parseInt(defectCups), parseFloat((defectCups * (defectType === 'Taint' ? 2 : (defectType === 'Fault' ? 4 : 0)))),
        totalScore, finalScore, notes, primaryFlavorNote
      ]
    );

    // Reset form (simplified for brevity)
    setLotId('');
    setCupperName('');
    setCuppingDate(new Date().toISOString().split('T')[0]);
    setRoastLevel(7.0);
    setFragranceDry(7.0);
    setFragranceBreak(7.0);
    setScoreFlavor(0.0);
    setScoreAftertaste(0.0);
    setScoreAcidity(0.0);
    setAcidityIntensity(5);
    setScoreBody(0.0);
    setBodyLevel(5);
    setScoreBalance(0.0);
    setScoreOverall(0.0);
    setUniformityCups([1, 1, 1, 1, 1]);
    setCleanCupCups([1, 1, 1, 1, 1]);
    setSweetnessCups([1, 1, 1, 1, 1]);
    setDefectType('None');
    setDefectCups(0);
    setNotes('');
    setPrimaryFlavorNote('');

    triggerRefresh();
  };


  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6">
      <h3 className="text-2xl font-bold mb-4">SCAA Cupping Session</h3>
      
      {/* Final Score Display */}
      <div className="bg-emerald-600 text-white p-6 rounded-lg text-center shadow-lg">
        <p className="text-sm uppercase font-bold opacity-80">Final Score</p>
        <p className="text-6xl font-extrabold">{finalScore}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Lot</label>
            <select value={lotId} onChange={(e) => setLotId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                <option value="">Select Lot</option>
                {lots.map(l => <option key={l.id} value={l.id}>{l.public_id} ({farms.find(f=>f.id===l.farm_id)?.name})</option>)}
            </select>
        </div>
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Cupper Name</label>
            <input type="text" value={cupperName} onChange={(e) => setCupperName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Cupping Date</label>
            <input type="date" value={cuppingDate} onChange={(e) => setCuppingDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Roast Level</label>
            <input type="number" step="0.1" min="0" max="10" value={roastLevel} onChange={(e) => setRoastLevel(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>
      </div>

      {/* Main Cupping Attributes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-lg">
        {renderSlider('Fragrance Dry', fragranceDry, setFragranceDry, 'scoreFragrance')}
        {renderSlider('Fragrance Break', fragranceBreak, setFragranceBreak, 'scoreFragrance')}
        {renderSlider('Flavor', scoreFlavor, setScoreFlavor)}
        {renderSlider('Aftertaste', scoreAftertaste, setScoreAftertaste)}
        {renderSlider('Acidity', scoreAcidity, setScoreAcidity)}
        <IntensitySlider label="Acidity Intensity" value={acidityIntensity} setValue={setAcidityIntensity} />
        {renderSlider('Body', scoreBody, setScoreBody)}
        <IntensitySlider label="Body Level" value={bodyLevel} setValue={setBodyLevel} />
        {renderSlider('Balance', scoreBalance, setScoreBalance)}
        {renderSlider('Overall', scoreOverall, setScoreOverall)}
      </div>

      {/* Checkboxes for Uniformity, Clean Cup, Sweetness */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CupCheckboxGroup label="Uniformity" cups={uniformityCups} setCups={setUniformityCups} />
        <CupCheckboxGroup label="Clean Cup" cups={cleanCupCups} setCups={setCleanCupCups} />
        <CupCheckboxGroup label="Sweetness" cups={sweetnessCups} setCups={setSweetnessCups} />
      </div>

      {/* Defects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Defect Type</label>
          <select value={defectType} onChange={(e) => setDefectType(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            <option value="None">None</option>
            <option value="Taint">Taint (-2/cup)</option>
            <option value="Fault">Fault (-4/cup)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Defect Cups</label>
          <input type="number" min="0" max="5" value={defectCups} onChange={(e) => setDefectCups(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Primary Flavor Note</label>
        <input type="text" value={primaryFlavorNote} onChange={(e) => setPrimaryFlavorNote(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>

      <button type="submit" className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-md shadow-lg hover:bg-emerald-700 transition-colors">Save Cupping Session</button>
    </form>
  );
};

// --- Helper Components ---
const renderSlider = (label, value, setValue) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">{label}: {value.toFixed(1)}</label>
    <input
      type="range" min="0" max="10" step="0.25"
      value={value}
      onChange={(e) => setValue(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-sm"
    />
  </div>
);

const IntensitySlider = ({ label, value, setValue }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}: {value}</label>
      <input
        type="range" min="1" max="10" step="1"
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-sm"
      />
    </div>
  );

const CupCheckboxGroup = ({ label, cups, setCups }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="flex space-x-2">
      {cups.map((isChecked, index) => (
        <button
          key={index}
          type="button"
          onClick={() => {
            const newCups = [...cups];
            newCups[index] = isChecked === 1 ? 0 : 1;
            setCups(newCups);
          }}
          className={`p-2 rounded-full border ${isChecked === 1 ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-gray-200 border-gray-300 text-gray-600'}`}
          aria-label={`${label} cup ${index + 1}`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.5 3H6.5A2.5 2.5 0 004 5.5v13A2.5 2.5 0 006.5 21h11A2.5 2.5 0 0021 18.5V5.5A2.5 2.5 0 0018.5 3zM15 10a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
      ))}
    </div>
  </div>
);


export default SCAACuppingForm;