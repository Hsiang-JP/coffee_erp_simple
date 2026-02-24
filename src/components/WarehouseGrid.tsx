import React, { useState, useMemo } from 'react';
import { VwBagDetails } from '../types/database';

interface WarehouseGridProps {
  coffees?: VwBagDetails[];
  selectedBags?: VwBagDetails[];
}

const WarehouseGrid: React.FC<WarehouseGridProps> = ({ coffees = [], selectedBags = [] }) => {
  const [hoveredBag, setHoveredBag] = useState<VwBagDetails | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const palettes = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF'];
  const levels = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  // Filter bags physically in the warehouse
  const activeBags = useMemo(() => {
    return coffees.filter(b => b.status !== 'Shipped' && b.stock_code);
  }, [coffees]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const findBagByCode = (code: string) => {
    return activeBags.find(b => b.stock_code === code);
  };

  return (
    <div 
      className="relative bg-white p-8 rounded-3xl shadow-sm border border-stone-200" 
      onMouseMove={handleMouseMove}
    >
      <h2 className="text-lg font-bold mb-10">Warehouse Cora <span className="text-stone-300 font-light">| Visual Map</span></h2>
      
      <div className="flex gap-4 justify-center">
        {palettes.map(p => (
          <div key={p} className="flex flex-col gap-1.5 overflow-hidden">
            {levels.map(l => {
              const code = `${p}-${l}`;
              const bag = findBagByCode(code);
              const isSelected = bag && selectedBags.some(sb => sb.id === bag.id);

              return (
                <div 
                  key={l} 
                  className="w-10 h-10 rounded-md border border-stone-50 bg-stone-50/30 flex items-center justify-center relative"
                  title={code}
                >
                  {/* Static Data-Driven Rendering: No animations, just the current state */}
                  {bag && (
                    <div
                      onMouseEnter={() => setHoveredBag(bag)}
                      onMouseLeave={() => setHoveredBag(null)}
                      className={`w-full h-full rounded-md border flex items-center justify-center cursor-pointer shadow-sm transition-all
                        ${isSelected ? 'bg-emerald-500 border-emerald-600 z-10 scale-110 border-[3px] shadow-lg' : 
                          bag.status === 'Allocated' ? 'bg-blue-500 border-blue-900 border-[1px]' : 'bg-sky-600 border-sky-700 border-[1px]'}
                      `}
                    >
                      {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="text-center text-[10px] font-bold text-stone-400 mt-2">{p}</div>
          </div>
        ))}
      </div>

      {/* Bento-style Tooltip */}
      {hoveredBag && (
        <div 
          className="fixed pointer-events-none z-50 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-stone-200 w-56 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ 
            left: mousePos.x + 20, 
            top: mousePos.y - 120 
          }}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded text-[8px] font-bold uppercase tracking-wider">
                {hoveredBag.status}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  hoveredBag.avg_score >= 85 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {hoveredBag.avg_score > 0 ? hoveredBag.avg_score.toFixed(1) : 'No QC'}
                </span>
                <span className="text-[10px] font-mono text-stone-400">{hoveredBag.stock_code}</span>
              </div>
            </div>
            
            <div>
              <label className="text-[8px] uppercase font-bold text-stone-400 block mb-0.5">Farm / Producer</label>
              <div className="text-sm font-bold text-stone-900 leading-tight">
                {hoveredBag.farm_name || 'Unknown Farm'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-stone-100">
              <div>
                <label className="text-[8px] uppercase font-bold text-stone-400 block mb-0.5">Variety</label>
                <span className="text-xs font-semibold text-stone-700">{hoveredBag.variety}</span>
              </div>
              <div>
                <label className="text-[8px] uppercase font-bold text-stone-400 block mb-0.5">Weight</label>
                <span className="text-xs font-semibold text-stone-700">{hoveredBag.weight_kg} kg</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseGrid;
