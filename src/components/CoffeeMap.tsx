import React, { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import { StageType } from '../types/database';

interface StageCoord {
  name: string;
  coordinates: [number, number];
}

const STAGE_COORDS: Record<StageType, StageCoord> = {
  'Farm': { name: 'Cusco, Peru', coordinates: [-71.9675, -13.5319] },
  'Cora': { name: 'Lima Warehouse', coordinates: [-77.0428, -12.0464] },
  'Port-Export': { name: 'Callao Port', coordinates: [-77.1261, -12.0508] },
  'Port-Import': { name: 'Tokyo Port', coordinates: [139.77, 35.62] },
  'Final Destination': { name: 'Tokyo Roastery', coordinates: [139.69, 35.68] }
};

const STAGE_ORDER: StageType[] = ['Farm', 'Cora', 'Port-Export', 'Port-Import', 'Final Destination'];

interface CoffeeMapProps {
  currentStage: StageType;
}

const CoffeeMap: React.FC<CoffeeMapProps> = ({ currentStage }) => {
  const pinRef = useRef<SVGGElement>(null);
  const geoUrl = "https://raw.githubusercontent.com/lotusms/world-map-data/main/world.json";

  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  
  // Calculate visited stages and paths
  const { visitedStages, connections } = useMemo(() => {
    const visited = STAGE_ORDER.slice(0, currentIndex + 1);
    const paths: { from: [number, number]; to: [number, number]; id: string }[] = [];
    for (let i = 0; i < visited.length - 1; i++) {
      paths.push({
        from: STAGE_COORDS[visited[i]].coordinates,
        to: STAGE_COORDS[visited[i+1]].coordinates,
        id: `${visited[i]}-${visited[i+1]}`
      });
    }
    return { visitedStages: visited, connections: paths };
  }, [currentIndex]);

  useEffect(() => {
    if (pinRef.current) {
      // Arrival Animation: Pop in at the new location
      gsap.fromTo(pinRef.current, 
        { scale: 0, opacity: 0 }, 
        { 
          scale: 1, 
          opacity: 1, 
          duration: 1.2, 
          ease: "elastic.out(1, 0.5)",
          overwrite: "auto" 
        }
      );
    }
  }, [currentStage]);

  return (
    <div className="w-full h-full bg-stone-50 rounded-xl overflow-hidden">
      <ComposableMap 
        projectionConfig={{ 
          scale: 160, 
          rotate: [-150, 0, 0] // Put Americas on the right
        }} 
        className="w-full h-full"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#EAEAEC"
                stroke="#D6D6DA"
                strokeWidth={0.5}
                style={{ default: { outline: "none" }, hover: { fill: "#F5F5F7", outline: "none" } }}
              />
            ))
          }
        </Geographies>

        {/* Trace Lines */}
        {connections.map((path) => (
          <Line
            key={path.id}
            from={path.from}
            to={path.to}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="4 2"
            opacity={0.4}
          />
        ))}
        
        {/* Past Markers */}
        {visitedStages.slice(0, -1).map((stage) => (
          <Marker key={stage} coordinates={STAGE_COORDS[stage].coordinates}>
            <circle r={3} fill="#ef4444" opacity={0.6} />
          </Marker>
        ))}

        {/* The Active Animated Bag Pin */}
        <Marker coordinates={STAGE_COORDS[currentStage]?.coordinates || [-71.96, -13.53]}>
          <g ref={pinRef}>
            <circle r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
            <circle r={12} fill="#ef4444" opacity={0.2} className="animate-ping" />
          </g>
        </Marker>
      </ComposableMap>
      
      <div className="absolute bottom-4 left-4 bg-white/80 p-2 rounded text-[9px] uppercase tracking-tighter font-bold text-stone-400">
        Current Node: {STAGE_COORDS[currentStage]?.name}
      </div>
    </div>
  );
};

export default CoffeeMap;
