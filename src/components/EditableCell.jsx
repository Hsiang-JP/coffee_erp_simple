import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { updateCell } from '../db/dbSetup';
import { useStore } from '../store/store';

const EditableCell = ({ tableName, id, column, value, type = 'text', options = [], forceDisabled = false }) => {
  const isDevMode = useStore((state) => state.isDevMode);
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const cellRef = useRef(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleSave = async () => {
    if (currentValue === value) {
      setEditing(false);
      return;
    }

    try {
      await updateCell(tableName, id, column, currentValue);
      
      gsap.to(cellRef.current, {
        backgroundColor: '#d1fae5', 
        duration: 0.2,
        onComplete: () => {
          gsap.to(cellRef.current, { backgroundColor: 'transparent', duration: 0.5 });
        }
      });

      setEditing(false);
      triggerRefresh();
    } catch (e) {
      console.error(e);
      setCurrentValue(value); 
      setEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setCurrentValue(value);
      setEditing(false);
    }
  };

  const getDisplayValue = () => {
    if (type === 'select' && options.length > 0) {
        const option = options.find(o => (o.value === value || o === value));
        if (option) return typeof option === 'object' ? option.label : option;
    }
    if (value === null || value === undefined || value === '') return <span className="text-stone-300 italic">---</span>;
    return typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value;
  };

  // Logic: System Managed Relations are NOT editable even in Dev Mode
  const isEditable = isDevMode && !forceDisabled;

  if (!isEditable) {
    return (
        <span className={`px-2 py-1 block truncate max-w-[200px] text-xs ${forceDisabled ? 'text-stone-400 italic' : ''}`}>
            {getDisplayValue()}
        </span>
    );
  }

  return (
    <div 
      ref={cellRef}
      className={`min-h-[32px] flex items-center px-2 py-1 border border-transparent hover:border-emerald-300 rounded cursor-text transition-colors group ${editing ? 'bg-white shadow-sm ring-1 ring-emerald-500 z-10' : ''}`}
      onClick={() => !editing && setEditing(true)}
    >
      {editing ? (
        type === 'select' ? (
          <select
            autoFocus
            className="w-full text-xs bg-white border-none focus:ring-0 p-0 font-medium"
            value={currentValue || ''}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleSave}
          >
            {options.map(opt => {
                const val = typeof opt === 'object' ? opt.value : opt;
                const lab = typeof opt === 'object' ? opt.label : opt;
                return <option key={String(val)} value={val}>{lab}</option>;
            })}
          </select>
        ) : (
          <input
            autoFocus
            type={type}
            className="w-full text-xs bg-transparent border-none focus:ring-0 p-0 font-medium"
            value={currentValue ?? ''}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        )
      ) : (
        <span className="text-xs truncate w-full flex justify-between items-center">
            {getDisplayValue()}
            <svg className="w-3 h-3 text-stone-200 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
        </span>
      )}
    </div>
  );
};

export default EditableCell;
