import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

// Coordinate mapping for each stage (X, Y in SVG space)
const STAGE_COORDS = {
  'Farm': { name: 'Cusco, Peru', coordinates: [-71.9675, -13.5319] },
  'Cora': { name: 'Lima Warehouse', coordinates: [-77.0428, -12.0464] },
  'Port-Export': { name: 'Callao Port', coordinates: [-77.1261, -12.0508] },
  'Port-Import': { name: 'Tokyo Port', coordinates: [139.77, 35.62] },
  'Final Destination': { name: 'Tokyo Roastery', coordinates: [139.69, 35.68] }
};

const CoffeeMap = ({ currentStage }) => {
  const pinRef = useRef(null);
  const geoUrl = "https://raw.githubusercontent.com/lotusms/world-map-data/main/world.json";

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
          {({ geographies }) =>
            geographies.map((geo) => (
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
        
        {/* The Animated Bag Pin */}
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