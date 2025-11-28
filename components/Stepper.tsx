import React from 'react';

interface StepperProps {
    currentStep: number;
    steps: string[];
    onStepClick?: (stepIndex: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, steps, onStepClick }) => {
    return (
        <div className="w-full max-w-3xl mx-auto mb-8">
            <div className="relative flex items-center justify-between">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-slate-800 -z-10"></div>
                <div
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-indigo-500 transition-all duration-500 ease-in-out -z-10"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isActive = index <= currentStep;
                    const isCurrent = index === currentStep;

                    return (
                        <div key={index} className="flex flex-col items-center group cursor-pointer" onClick={() => onStepClick && onStepClick(index)}>
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${isActive
                                        ? 'bg-slate-900 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                                        : 'bg-slate-900 border-slate-700 text-slate-600 group-hover:border-slate-500'
                                    }`}
                            >
                                {isActive ? (
                                    <div className={`w-2.5 h-2.5 rounded-full bg-indigo-500 ${isCurrent ? 'animate-pulse' : ''}`} />
                                ) : (
                                    <span className="text-xs font-bold">{index + 1}</span>
                                )}
                            </div>
                            <span
                                className={`absolute mt-10 text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-indigo-400' : 'text-slate-600'
                                    }`}
                            >
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
