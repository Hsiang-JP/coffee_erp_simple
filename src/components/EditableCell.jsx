import React, { useState, useRef, useEffect } from 'react';
import { execute } from '../db/dbSetup';
import { useStore } from '../store/store';
import { useTranslation } from 'react-i18next';

const EditableCell = ({ tableName, id, column, value, type, options, forceDisabled }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || '');
  const inputRef = useRef(null);
  const { triggerRefresh } = useStore();

  // 1. Sync local state if external data changes
  useEffect(() => {
    setCurrentValue(value || '');
  }, [value]);

  // 2. Auto-focus the input the moment the user clicks the cell
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // 3. Database Save Logic
  const handleSave = async () => {
    setIsEditing(false);
    
    // Don't waste a database call if the value didn't actually change
    if (currentValue === value) return; 

    try {
      await execute(`UPDATE ${tableName} SET ${column} = ? WHERE id = ?`, [currentValue, id]);
      triggerRefresh(); // Tell Zustand to update the UI globally
    } catch (error) {
      console.error("Failed to update cell:", error);
      alert(t('alerts.error.dbUpdate', { message: error.message }));
      setCurrentValue(value); // Revert to original value on failure
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setCurrentValue(value); // Cancel edit
      setIsEditing(false);
    }
  };

  // --- RENDER: Locked State ---
  if (forceDisabled) {
    return (
      <div className="flex items-center gap-2 opacity-40 cursor-not-allowed">
        <span className="text-[10px]">🔒</span>
        <span className="text-zinc-500 italic">{value || 'N/A'}</span>
      </div>
    );
  }

  // --- RENDER: Active Editing State ---
  if (isEditing) {
    // 🎨 UI FIX: Dark HUD Input Styling with glowing emerald focus
    const inputClasses = "w-full bg-zinc-950 text-emerald-400 border border-emerald-500/50 rounded-lg px-3 py-2 outline-none font-mono text-xs shadow-[0_0_10px_rgba(16,185,129,0.2)] focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all";

    if (type === 'select') {
      return (
        <select
          ref={inputRef}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleSave}
          className={inputClasses}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef}
        type={type === 'number' ? 'number' : 'text'}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={inputClasses}
      />
    );
  }

  // --- RENDER: Default Clickable State ---
  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className="group flex justify-between items-center px-3 py-2 -mx-3 rounded-lg border border-transparent hover:border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-all"
    >
      <span className="truncate max-w-[200px]">
        {value || <span className="text-zinc-700 italic">{t('common.empty')}</span>}
      </span>
      <span className="text-emerald-500/0 group-hover:text-emerald-500/80 transition-colors text-[9px] font-black tracking-widest uppercase">
        ✎ {t('common.edit')}
      </span>
    </div>
  );
};

export default EditableCell;