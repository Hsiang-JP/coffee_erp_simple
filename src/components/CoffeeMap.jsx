import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import { useStore } from '../store/store';

const STAGE_IDX = {
  'Farm': 0, 'Cora': 1, 'Port-Export': 2, 'Port-Import': 3, 'Final Destination': 4
};

const CoffeeMap = ({ currentStage = 'Farm', bags = [], contractId = null }) => {
  // Add default empty arrays to destructuring to prevent 'undefined' errors
  const { 
    farms = [], 
    contracts = [], 
    clients = [], 
    lots = [], 
    locations = [] 
  } = useStore();
  
  const geoUrl = "https://raw.githubusercontent.com/lotusms/world-map-data/main/world.json";
  const currentIdx = STAGE_IDX[currentStage] || 0;

  // Helper to find coords with safety checks
  const getCoords = (name) => {
    // Safety: ensure locations is an array before calling .find
    const loc = Array.isArray(locations) ? locations.find(l => l.name === name) : null;
    if (loc) return [loc.longitude, loc.latitude];
    
    // Fallbacks
    if (name?.includes('Peru')) return [-75.01, -9.19];
    if (name?.includes('Japan')) return [138.25, 36.20];
    return [-77.04, -12.04]; // Default to Lima
  };

  const network = useMemo(() => {
    const lines = [];
    const markers = [];

    // Ensure we have data before running mapping logic
    if (!Array.isArray(bags) || bags.length === 0) {
        return { lines: [], markers: [] };
    }

    // 1. ORIGINS (From Farms -> Cora)
    const uniqueRegions = [...new Set(bags.map(b => {
      const lot = lots?.find(l => l.id === b.lot_id);
      const farm = farms?.find(f => f.id === lot?.farm_id);
      return farm?.region;
    }))].filter(Boolean);

    const coraCoords = getCoords('Cora Warehouse');
    const exportPortCoords = getCoords('Callao Port');

    uniqueRegions.forEach(region => {
      const farmCoords = getCoords(`${region}, Peru`);
      markers.push({ name: region, coordinates: farmCoords, stage: 0 });
      lines.push({ from: farmCoords, to: coraCoords, stageIndex: 0 });
    });

    // 2. THE TRUNK (Cora -> Export Port)
    markers.push({ name: 'Warehouse', coordinates: coraCoords, stage: 1 });
    lines.push({ from: coraCoords, to: exportPortCoords, stageIndex: 1 });

    // 3. THE OCEAN (Export Port -> Client Port)
    let destCoords = [139.77, 35.62]; 
    if (contractId) {
      const contract = contracts?.find(c => c.id === contractId);
      const client = clients?.find(c => c.id === contract?.client_id);
      if (client?.destination_port) {
        destCoords = getCoords(client.destination_port);
      }
    }

    markers.push({ name: 'Export Port', coordinates: exportPortCoords, stage: 2 });
    lines.push({ from: exportPortCoords, to: destCoords, stageIndex: 2 });

    // 4. THE LAST MILE (Port -> Final)
    markers.push({ name: 'Import Port', coordinates: destCoords, stage: 3 });
    markers.push({ name: 'Final Roastery', coordinates: [destCoords[0] + 0.2, destCoords[1] + 0.2], stage: 4 });
    lines.push({ from: destCoords, to: [destCoords[0] + 0.2, destCoords[1] + 0.2], stageIndex: 3 });

    return { lines, markers };
  }, [bags, contractId, farms, contracts, clients, lots, locations]);

  // If the store is still syncing, show a simple background or loader
  if (!locations || locations.length === 0) {
    return <div className="w-full h-full bg-[#fdfbf7] flex items-center justify-center text-stone-400 text-[10px] uppercase tracking-widest">Initialising Spatial Island...</div>;
  }

  return (
    <div className="w-full h-full bg-[#fdfbf7] rounded-xl overflow-hidden relative">
      <style>
        {`
          @keyframes flow { to { stroke-dashoffset: -12; } }
          .line-active { stroke-dasharray: 6; animation: flow 1.5s linear infinite; }
        `}
      </style>

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
                style={{ default: { outline: "none" } }}
              />
            ))
          }
        </Geographies>
        
        {network.lines.map((line, i) => {
          const isCompleted = currentIdx > line.stageIndex;
          const isActive = currentIdx === line.stageIndex;
          const isPending = currentIdx < line.stageIndex;

          return (
            <Line
              key={`line-${i}`}
              from={line.from}
              to={line.to}
              stroke={isCompleted || isActive ? "#10B981" : "#d1d5db"}
              strokeWidth={isActive ? 3 : 1.5}
              strokeLinecap="round"
              className={isActive ? "line-active" : ""}
              style={{
                strokeDasharray: isPending ? "2 4" : "none",
                opacity: isPending ? 0.3 : 1,
                transition: "stroke 0.5s ease"
              }}
            />
          );
        })}

        {network.markers.map((marker, i) => {
          const isReached = currentIdx >= marker.stage;
          const isCurrent = currentIdx === marker.stage;

          return (
            <Marker key={`marker-${i}`} coordinates={marker.coordinates}>
              <circle 
                r={isCurrent ? 5 : 3} 
                fill={isReached ? "#059669" : "#fff"} 
                stroke={isReached ? "#fff" : "#9ca3af"} 
                strokeWidth={1} 
              />
              {isCurrent && (
                <circle r={12} fill="#10b981" opacity={0.3} className="animate-ping" />
              )}
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
};

export default CoffeeMap;