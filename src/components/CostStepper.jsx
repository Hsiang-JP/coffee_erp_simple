import React from 'react';

const steps = [
  { id: 'Farm', name: 'Farm Gate', description: 'Origin Base Cost', costKey: 'cost_to_warehouse' },
  { id: 'Cora', name: 'Warehouse', description: 'At Cora Warehouse', costKey: 'cost_to_export' },
  { id: 'Port-Export', name: 'Export', description: 'Ready for Shipping', costKey: 'cost_to_import' },
  { id: 'Port-Import', name: 'Import', description: 'Arrived at Destination', costKey: 'cost_to_client' },
  { id: 'Final Destination', name: 'Client', description: 'Delivered to Roastery', costKey: null },
];

const CostStepper = React.memo(({ currentStage, costs }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStage);

  return (
    <div className="">
      <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-stone-400 mb-8">Value Chain Timeline</h3>
      
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {steps.map((step, stepIdx) => {
            const isComplete = stepIdx < currentIndex;
            const isCurrent = stepIdx === currentIndex;
            const isPast = stepIdx <= currentIndex;
            
            // The cost to get to the NEXT stage
            const transitionCost = step.costKey ? (costs?.[step.costKey] || 0) : null;

            return (
              <li key={step.id}>
                {/* Increased bottom padding to make room for the moved badge */}
                <div className="relative pb-12">
                  {/* Vertical Line */}
                  {stepIdx !== steps.length - 1 ? (
                    <span className={`absolute top-4 left-4 -ml-px h-full w-0.5 ${isComplete ? 'bg-emerald-500' : 'bg-stone-100'}`} aria-hidden="true" />
                  ) : null}

                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                        isCurrent ? 'bg-white border-2 border-emerald-600' : 
                        isComplete ? 'bg-emerald-600' : 'bg-stone-50 border border-stone-200'
                      }`}>
                        {isComplete ? (
                          <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : isCurrent ? (
                          <span className="h-2.5 w-2.5 bg-emerald-600 rounded-full" />
                        ) : null}
                      </span>
                    </div>
                    
                    {/* Content Container: Changed to flex-col to stack items vertically */}
                    <div className="flex min-w-0 flex-1 flex-col pt-1.5">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-tight ${isCurrent ? 'text-stone-900' : isPast ? 'text-stone-700' : 'text-stone-300'}`}>
                          {step.name}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5 font-light italic">{step.description}</p>
                      </div>

                      {/* Cost Badge: Moved HERE, below description. Colors preserved. Wording changed. */}
                      {transitionCost !== null && isPast && (
                        <div className="mt-3 flex">
                            <div className={`flex items-center gap-2 py-1 px-2 rounded-md border text-[10px] font-mono font-bold transition-all ${
                                // Exact same color logic as your provided code
                                isComplete && transitionCost > 0 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                    : 'bg-white border-stone-100 text-stone-300'
                            }`}>
                                {/* Wording changed: removed "/ KG" */}
                                ${transitionCost.toFixed(2)}
                            </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
});

export default CostStepper;