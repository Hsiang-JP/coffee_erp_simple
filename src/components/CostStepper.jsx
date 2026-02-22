import React from 'react';

const steps = [
  { id: 'Farm', name: 'Farm Gate', description: 'Harvest & Processing' },
  { id: 'Cora', name: 'Warehouse', description: 'Storage & QC' },
  { id: 'Transportation', name: 'In Transit', description: 'Freight & Insurance' },
  { id: 'Port', name: 'Export', description: 'Customs & Loading' },
  { id: 'Final Destination', name: 'Client', description: 'Delivery & Final Sale' },
];

const CostStepper = ({ currentStage, costs }) => {
  // Determine index of current stage
  const currentIndex = steps.findIndex(s => s.id === currentStage);

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">Value Chain Progression</h3>
      <nav aria-label="Progress">
        <ol role="list" className="overflow-hidden">
          {steps.map((step, stepIdx) => {
            const isComplete = stepIdx < currentIndex;
            const isCurrent = stepIdx === currentIndex;
            
            // Mock cost accumulation for display
            let costDisplay = "$0.00";
            if (stepIdx <= currentIndex) {
                // Logic to show accumulated cost would go here based on the 'costs' prop
                // For demo, we just show a placeholder or value from props if available
                if (step.id === 'Farm') costDisplay = `$${costs?.cost_at_farm || '8.50'}`;
                if (step.id === 'Cora') costDisplay = `$${costs?.cost_at_warehouse || '9.20'}`;
                // ... etc
            }

            return (
              <li key={step.name} className={`relative pb-10 ${stepIdx === steps.length - 1 ? '' : ''}`}>
                {stepIdx !== steps.length - 1 ? (
                  <div className={`absolute top-4 left-4 -ml-px h-full w-0.5 ${isComplete ? 'bg-emerald-600' : 'bg-gray-200'}`} aria-hidden="true" />
                ) : null}
                <div className="relative flex items-start group">
                  <span className="h-9 flex items-center">
                    <span className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 ${
                      isCurrent ? 'bg-white border-emerald-600' : 
                      isComplete ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-gray-300'
                    }`}>
                      {isComplete ? (
                        <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : isCurrent ? (
                        <span className="h-2.5 w-2.5 bg-emerald-600 rounded-full" />
                      ) : (
                        <span className="h-2.5 w-2.5 bg-transparent rounded-full" />
                      )}
                    </span>
                  </span>
                  <div className="ml-4 min-w-0 flex flex-col">
                    <span className={`text-sm font-semibold tracking-wide ${isCurrent ? 'text-emerald-900' : 'text-gray-500'}`}>{step.name}</span>
                    <span className="text-sm text-gray-500">{step.description}</span>
                  </div>
                  <div className="ml-auto pr-4 text-right">
                     <span className={`text-sm font-mono ${isComplete || isCurrent ? 'text-gray-900 font-bold' : 'text-gray-300'}`}>
                        {stepIdx <= currentIndex ? costDisplay : '---'}
                     </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default CostStepper;
