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

  const getCoords = (searchQueries) => {
    const queries = Array.isArray(searchQueries) ? searchQueries : [searchQueries];
    
    for (const query of queries) {
      if (!query) continue;
      
      if (query === 'Cora') return [-72.6910885632289, -12.849994725082212];
      if (query === 'Callao Port') return [-77.1500, -12.0500];

      if (Array.isArray(locations)) {
        const normalized = query.toLowerCase().trim();
        let loc = locations.find(l => l.name.toLowerCase() === normalized);
        
        if (!loc) {
           loc = locations.find(l => 
             l.name.toLowerCase().includes(normalized) || 
             normalized.includes(l.name.toLowerCase())
           );
        }
        if (loc) return [loc.longitude, loc.latitude]; 
      }

      if (query.includes('Peru')) return [-75.01, -9.19];
      if (query.includes('Japan')) return [138.25, 36.20];
      if (query.includes('Taiwan')) return [121.4876, 25.0345];
      if (query.includes('USA')) return [-122.3321, 47.6062];
    }
    
    return null; 
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
      const farmCoords = getCoords([region, 'Peru']) || [-77.04, -12.04]; 
      markers.push({ name: region, coordinates: farmCoords, stage: 0 });
      lines.push({ from: farmCoords, to: coraCoords, stageIndex: 0 });
    });

    markers.push({ name: 'Cora Warehouse', coordinates: coraCoords, stage: 1 });
    lines.push({ from: coraCoords, to: exportPortCoords, stageIndex: 1 });

    let destCoords = [139.77, 35.62]; 
    let finalCoords = [139.97, 35.82]; 

    if (contractId) {
      const contract = contracts?.find(c => c.id === contractId);
      const client = clients?.find(c => c.id === contract?.client_id);
      
      if (client) {
        const resolvedImport = getCoords([client.destination_port, client.destination_city, client.destination_country]);
        if (resolvedImport) destCoords = resolvedImport;

        const resolvedFinal = getCoords([client.destination_city, client.destination_country, client.destination_port]);
        if (resolvedFinal) finalCoords = resolvedFinal;
        
        if (destCoords[0] === finalCoords[0] && destCoords[1] === finalCoords[1]) {
           finalCoords = [destCoords[0] + 0.15, destCoords[1] + 0.15];
        }
      }
    }

    markers.push({ name: 'Export Port', coordinates: destCoords, stage: 2 });
    lines.push({ from: exportPortCoords, to: destCoords, stageIndex: 2 });

    markers.push({ name: 'Final Roastery', coordinates: finalCoords, stage: 4 });
    lines.push({ from: destCoords, to: finalCoords, stageIndex: 3 });

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
          // 🚨 THE FIX: Do not draw any lines that belong to future stages!
          if (line.stageIndex >= currentIdx) return null;

          return (
            <Line
              key={`line-${i}`}
              from={line.from}
              to={line.to}
              stroke="#10B981"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          );
        })}

        {network.markers.map((marker, i) => {
          // 🚨 THE FIX: Do not draw any destination dots until the coffee arrives!
          if (marker.stage > currentIdx) return null;

          const isCurrent = marker.stage === currentIdx;

          return (
            <Marker key={`marker-${i}`} coordinates={marker.coordinates}>
              {/* Pulsing Aura - Only on the active, current location */}
              {isCurrent && (
                <circle r="4" fill="#10b981">
                  <animate attributeName="r" begin="0s" dur="1.5s" values="4; 16" repeatCount="indefinite" />
                  <animate attributeName="opacity" begin="0s" dur="1.5s" values="0.6; 0" repeatCount="indefinite" />
                </circle>
              )}
              
              {/* Every node reached so far gets a solid green dot */}
              <circle 
                r={isCurrent ? 6 : 4} 
                fill="#10b981" 
                stroke="#fff" 
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