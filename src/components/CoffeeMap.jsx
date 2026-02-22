import React, { useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { gsap } from 'gsap';

// A rough geoUrl for the world map
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const locations = {
  'Farm': { coordinates: [-72.5, -13.1], label: "Cusco (Farm)" }, // Peru
  'Cora': { coordinates: [-77.04, -12.04], label: "Lima (Warehouse)" }, // Lima
  'Port': { coordinates: [-77.1, -12.0], label: "Callao (Port)" },
  'Transportation': { coordinates: [-40, 30], label: "Atlantic Ocean" }, // Middle of ocean
  'Final Destination': { coordinates: [139.69, 35.68], label: "Tokyo (Client)" } // Japan
};

const CoffeeMap = ({ currentStage }) => {
  const markerRef = useRef(null);
  
  const targetLocation = locations[currentStage] || locations['Farm'];

  useEffect(() => {
    // GSAP Animation to move the marker when stage changes
    // Note: React-simple-maps uses SVG, so we are animating the transform or coordinates if possible.
    // However, react-simple-maps renders based on props. To animate SMOOTHLY between coords,
    // we might need a custom hook or update the internal state that drives the Marker coordinates 
    // using GSAP's onUpdate.
    // For simplicity in this demo, we will let React render the new position and use CSS transition 
    // or simple GSAP 'from' animation.
    
    // A better approach for "smooth movement" across the map projection is complex 
    // because the projection is non-linear.
    // We will just animate the opacity or scale for now to show "Arrival".
    
    if (markerRef.current) {
      gsap.fromTo(markerRef.current, 
        { scale: 0, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 1, ease: "back.out(1.7)" }
      );
    }

  }, [currentStage]);

  return (
    <div className="w-full h-[500px] bg-sky-50 rounded-xl overflow-hidden border border-sky-100 shadow-sm relative">
      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 150 }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#EAEAEC"
                stroke="#D6D6DA"
              />
            ))
          }
        </Geographies>

        {/* Render Lines/Path if needed later */}

        {/* Active Marker */}
        <Marker coordinates={targetLocation.coordinates}>
          <g ref={markerRef} className="cursor-pointer">
            <circle r={8} fill="#10B981" stroke="#fff" strokeWidth={2} />
            <text
              textAnchor="middle"
              y={-15}
              style={{ fontFamily: "system-ui", fill: "#374151", fontSize: "12px", fontWeight: "bold" }}
            >
              {targetLocation.label}
            </text>
          </g>
        </Marker>
      </ComposableMap>
      
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow border border-gray-100">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Current Location</p>
        <p className="font-bold text-emerald-900">{targetLocation.label}</p>
      </div>
    </div>
  );
};

export default CoffeeMap;
