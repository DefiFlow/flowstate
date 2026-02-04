// app/components/modals/SuccessModal.tsx
import React from 'react';
import { X, CheckCircle2, Receipt, Loader2, Circle, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';
import { useFlowStore } from '../../store/useFlowStore';

// Define steps for the execution process, to be displayed in the modal.
const executionSteps = [
    "Initializing Agent",
    "Swapping Tokens on Sepolia",
    "Settling Payroll on Arc",
    "Execution Complete"
];

export const SuccessModal = () => {
    const { 
        showSuccessModal, 
        setShowSuccessModal, 
        txHash, 
        nodes, 
        isRunning,
        executionStep,
        executionError
    } = useFlowStore();

    const onClose = () => setShowSuccessModal(false);

    // Extract details from the action node for the summary card.
    const actionNode = nodes.find(n => (n.data as any)?.type === 'action');
    const amount = actionNode?.data?.input?.replace(/[^0-9.]/g, '') || '0.005';
    const fromToken = 'M-ETH'; // Based on handleStart logic in Header.tsx
    const toToken = 'USDC'; // Based on handleStart logic in Header.tsx

    const isComplete = !isRunning && !!txHash && !executionError;

    if (!showSuccessModal) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
            <div className="bg-[#121314] border border-[#2A2B32] p-8 rounded-[32px] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300 relative">

                <button onClick={onClose} className="absolute top-6 right-6 text-stone-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                {/* Header: Changes based on state (executing, success, error) */}
                <div className="flex flex-col items-center mb-8">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 
                        ${isComplete ? 'bg-[#00E676] shadow-[0_0_20px_rgba(0,230,118,0.3)]' : 
                          executionError ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' :
                          'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}`
                    }>
                        {isComplete ? <CheckCircle2 className="w-7 h-7 text-white" /> : 
                         executionError ? <AlertTriangle className="w-7 h-7 text-white" /> :
                         <Loader2 className="w-7 h-7 text-white animate-spin" />}
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {isComplete ? 'Transfer Successful' : executionError ? 'Execution Failed' : 'Agent Executing'}
                    </h2>
                    <p className="text-sm text-stone-400 mt-1 text-center">
                        {isComplete ? 'Payroll has been settled on Arc Testnet.' : executionError ? executionError : 'Please wait and confirm transactions in your wallet.'}
                    </p>
                </div>

                {/* Show details card only on success */}
                {isComplete && (
                    <div className="bg-[#08090A] rounded-2xl border border-[#2A2B32] p-5 mb-8 space-y-4 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center">
                            <span className="text-stone-500 text-[10px] uppercase font-bold tracking-widest">Amount Swapped</span>
                            <span className="font-bold text-white text-base">{amount} {fromToken}</span>
                        </div>
                        <div className="w-full border-t border-[#1A1D24]"></div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-stone-500 text-[10px] uppercase font-bold tracking-widest">Final Network</span>
                            <span className="font-bold text-white">Arc Testnet</span>
                        </div>
                    </div>
                )}

                {/* Steps List: Show only during execution */}
                {!isComplete && !executionError && (
                    <div className="space-y-4 mb-10 ml-1">
                        {executionSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-500" style={{ animationDelay: `${index * 100}ms`}}>
                                <div className={`flex items-center justify-center w-5 h-5 rounded-full transition-colors duration-300
                                    ${index < (executionStep || 0) ? 'bg-green-500 text-white' :
                                      index === (executionStep || 0) ? 'bg-blue-500 text-white' :
                                      'bg-stone-700 text-stone-400'
                                    }`
                                }>
                                    {index < (executionStep || 0) ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                                     index === (executionStep || 0) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                                     <Circle className="w-3.5 h-3.5" />}
                                </div>
                                <span className={`text-sm font-bold transition-colors duration-300
                                    ${index <= (executionStep || 0) ? 'text-white' : 'text-stone-500'}`
                                }>
                                    {step}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Action Button: Changes based on state */}
                {isComplete ? (
                    <button
                        onClick={() => txHash && window.open(`https://testnet.arcscan.com/tx/${txHash}`, '_blank')}
                        className="w-full bg-white text-black py-4 rounded-2xl font-black hover:bg-stone-200 transition-all shadow-lg active:scale-95 text-sm flex items-center justify-center gap-2"
                    >
                        View Receipt <Receipt className="w-4 h-4" />
                    </button>
                ) : executionError ? (
                    <button
                        onClick={onClose}
                        className="w-full bg-red-500 text-white py-4 rounded-2xl font-black hover:bg-red-600 transition-all shadow-lg active:scale-95 text-sm flex items-center justify-center gap-2"
                    >
                        Close
                    </button>
                ) : (
                    <button
                        disabled
                        className="w-full bg-stone-700 text-stone-400 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                    </button>
                )}

                {/* Transaction Hash Reference */}
                {txHash && (
                    <div className="mt-5 text-center">
                        <p className="text-[10px] text-stone-600 font-mono">
                            Ref {`${txHash.slice(0, 10)}...${txHash.slice(-8)}`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
