import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import { useStore } from '../store/store';

const STAGE_IDX = {
  'Farm': 0, 'Cora': 1, 'Port-Export': 2, 'Port-Import': 3, 'Final Destination': 4
};

const CoffeeMap = React.memo(({ currentStage = 'Farm', bags = [], contractId = null }) => {
  const { 
    farms = [], 
    contracts = [], 
    clients = [], 
    lots = [], 
    locations = [] 
  } = useStore();
  
  const geoUrl = "https://raw.githubusercontent.com/lotusms/world-map-data/main/world.json";
  const currentIdx = STAGE_IDX[currentStage] || 0;

  const getCoords = (name) => {
    if (name === 'Cora') return [-72.6910885632289, -12.849994725082212]; 
    if (name === 'Callao Port') return [-77.1500, -12.0500];

    const loc = Array.isArray(locations) ? locations.find(l => l.name === name) : null;
    if (loc) return [loc.longitude, loc.latitude];
    
    if (name?.includes('Japan')) return [138.25, 36.20];
    if (name?.includes('Taiwan')) return [121.4876, 25.0345];
    if (name?.includes('USA')) return [-122.3321, 47.6062]; 
    
    return [-77.04, -12.04]; 
  };

  const network = useMemo(() => {
    const lines = [];
    const markers = [];

    if (!Array.isArray(bags) || bags.length === 0) {
        return { lines: [], markers: [] };
    }

    const uniqueRegions = [...new Set(bags.map(b => {
      const lot = lots?.find(l => l.id === b.lot_id);
      const farm = farms?.find(f => f.id === lot?.farm_id);
      return farm?.region;
    }))].filter(Boolean);

    const coraCoords = getCoords('Cora');
    const exportPortCoords = getCoords('Callao Port');

    uniqueRegions.forEach(region => {
      const farmCoords = getCoords(region); 
      markers.push({ name: region, coordinates: farmCoords, stage: 0 });
      lines.push({ from: farmCoords, to: coraCoords, stageIndex: 0 });
    });

    markers.push({ name: 'Cora Warehouse', coordinates: coraCoords, stage: 1 });
    lines.push({ from: coraCoords, to: exportPortCoords, stageIndex: 1 });

    let destCoords = [139.77, 35.62]; 
    if (contractId) {
      const contract = contracts?.find(c => c.id === contractId);
      const client = clients?.find(c => c.id === contract?.client_id);
      if (client?.destination_port) {
        destCoords = getCoords(client.destination_port);
      } else if (client?.destination_city) {
        destCoords = getCoords(client.destination_city);
      }
    }

    markers.push({ name: 'Export Port', coordinates: exportPortCoords, stage: 2 });
    lines.push({ from: exportPortCoords, to: destCoords, stageIndex: 2 });

    markers.push({ name: 'Import Port', coordinates: destCoords, stage: 3 });
    markers.push({ name: 'Final Roastery', coordinates: [destCoords[0] + 0.2, destCoords[1] + 0.2], stage: 4 });
    lines.push({ from: destCoords, to: [destCoords[0] + 0.2, destCoords[1] + 0.2], stageIndex: 3 });

    return { lines, markers };
  }, [bags, contractId, farms, contracts, clients, lots, locations]);

  if (!locations || locations.length === 0) {
    return <div className="w-full h-full bg-[#fdfbf7] flex items-center justify-center text-stone-400 text-[10px] uppercase tracking-widest">Initialising Spatial Island...</div>;
  }

  return (
    <div className="w-full h-full bg-[#fdfbf7] rounded-xl overflow-hidden relative">
      <ComposableMap 
        projection="geoMercator"
        projectionConfig={{ 
          scale: 150, 
          rotate: [200, 0, 0], 
          center: [0, 20]      
        }} 
        className="w-full h-full"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#ece9e2"
                stroke="#d6d1c7"
                strokeWidth={0.5}
                style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
              />
            ))
          }
        </Geographies>
        
        {network.lines.map((line, i) => {
          const isCompleted = line.stageIndex < currentIdx;

          return (
            <Line
              key={`line-${i}`}
              from={line.from}
              to={line.to}
              stroke={isCompleted ? "#10B981" : "#d1d5db"}
              strokeWidth={isCompleted ? 2.5 : 1.5}
              strokeLinecap="round"
              style={{
                strokeDasharray: isCompleted ? "none" : "4 4",
                opacity: isCompleted ? 1 : 0.5,
                transition: "all 0.5s ease-in-out"
              }}
            />
          );
        })}

        {network.markers.map((marker, i) => {
          const isReached = marker.stage <= currentIdx;
          const isCurrent = marker.stage === currentIdx;

          return (
            <Marker key={`marker-${i}`} coordinates={marker.coordinates}>
              {/* 🚨 THE FIX: Native SVG Animation placed FIRST so it renders BEHIND the main dot */}
              {isCurrent && (
                <circle r="4" fill="#10b981">
                  <animate attributeName="r" begin="0s" dur="1.5s" values="4; 16" repeatCount="indefinite" />
                  <animate attributeName="opacity" begin="0s" dur="1.5s" values="0.6; 0" repeatCount="indefinite" />
                </circle>
              )}
              
              {/* Solid Node placed SECOND so it renders ON TOP cleanly */}
              <circle 
                r={isCurrent ? 6 : 4} 
                fill={isReached ? "#10b981" : "#fff"} 
                stroke={isReached ? "#fff" : "#9ca3af"} 
                strokeWidth={1.5} 
                style={{ transition: "all 0.5s ease-in-out" }}
              />
            </Marker>
          );
        })}
      </ComposableMap>
      
      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-4 rounded-[1.5rem] border border-stone-100 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Logistics Node</p>
        <p className="text-sm font-black text-zinc-900 mt-1 uppercase italic">
          {currentStage}
        </p>
      </div>
    </div>
  );
});

export default CoffeeMap;