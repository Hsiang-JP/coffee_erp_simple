import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import { useStore } from '../store/store';

const REGION_COORDS = {
  'Cusco': [-71.9675, -13.5319],
  'Cajamarca': [-78.5002, -7.1638],
  'Junin': [-75.2754, -11.1583],
  'Other': [-75.0, -10.0]
};

const HUBS = {
  'Cora': [-77.0428, -12.0464],
  'Port-Export': [-77.1261, -12.0508]
};

const DESTINATIONS = {
  'Japan': [139.77, 35.62],
  'USA': [-122.33, 47.60],
  'UK': [-0.12, 51.50],
  'Australia': [151.2, -33.86],
  'Default': [139.69, 35.68] 
};

const STAGE_IDX = {
  'Farm': 0, 'Cora': 1, 'Port-Export': 2, 'Port-Import': 3, 'Final Destination': 4
};

const CoffeeMap = ({ currentStage = 'Farm', bags = [], contractId = null }) => {
  const { farms, contracts, clients, lots } = useStore();
  const geoUrl = "https://raw.githubusercontent.com/lotusms/world-map-data/main/world.json";
  const currentIdx = STAGE_IDX[currentStage] || 0;

  const network = useMemo(() => {
    let origins = ['Other'];
    let destCoords = DESTINATIONS['Default'];

    if (bags.length > 0) {
      const bagFarms = bags.map(b => lots?.find(l => l.id === b.lot_id)?.farm_id).filter(Boolean);
      const regions = bagFarms.map(fid => farms.find(f => f.id === fid)?.region).filter(Boolean);
      if (regions.length > 0) origins = [...new Set(regions)];
    }

    if (contractId) {
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
        const client = clients.find(c => c.id === contract.client_id);
        if (client) {
          const matchedKey = Object.keys(DESTINATIONS).find(k => client.destination_country?.includes(k));
          destCoords = matchedKey ? DESTINATIONS[matchedKey] : DESTINATIONS['Default'];
        }
      }
    }

    const lines = [];
    const markers = [];
    const importPort = [destCoords[0] + 0.5, destCoords[1] - 0.5];

    origins.forEach(region => {
      const coord = REGION_COORDS[region] || REGION_COORDS['Other'];
      markers.push({ name: region, coordinates: coord, stage: 0 });
      lines.push({ from: coord, to: HUBS['Cora'], stageIndex: 0 });
    });

    markers.push({ name: 'Warehouse', coordinates: HUBS['Cora'], stage: 1 });
    lines.push({ from: HUBS['Cora'], to: HUBS['Port-Export'], stageIndex: 1 });
    markers.push({ name: 'Export', coordinates: HUBS['Port-Export'], stage: 2 });
    lines.push({ from: HUBS['Port-Export'], to: importPort, stageIndex: 2 });
    markers.push({ name: 'Import', coordinates: importPort, stage: 3 });
    lines.push({ from: importPort, to: destCoords, stageIndex: 3 });
    markers.push({ name: 'Roastery', coordinates: destCoords, stage: 4 });

    return { lines, markers };
  }, [bags, contractId, farms, contracts, clients, lots]);

  return (
    <div className="w-full h-full bg-[#fdfbf7] rounded-xl overflow-hidden relative">
      <style>
        {`
          @keyframes flow { to { stroke-dashoffset: -12; } }
          .line-active { stroke-dasharray: 6; animation: flow 1s linear infinite; }
        `}
      </style>

      <ComposableMap 
        projection="geoMercator"
        projectionConfig={{ 
          scale: 150, 
          rotate: [200, 0, 0], // This moves the Americas to the Right
          center: [0, 20]      // Tilts view to focus on the Northern/Central trade route
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
                transition: "all 0.5s ease"
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
      
      <div className="absolute top-4 right-4 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-stone-100 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">Logistics Visualization</p>
        <p className="text-xs font-bold text-stone-800 mt-1">
          {currentStage.replace('-', ' ')}
        </p>
      </div>
    </div>
  );
};

export default CoffeeMap;