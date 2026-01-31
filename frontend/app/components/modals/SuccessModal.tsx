// app/components/modals/SuccessModal.tsx
import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Receipt, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import { useFlowStore } from '../../store/useFlowStore';

export const SuccessModal = () => {
  const { setShowSuccessModal, txHash, nodes } = useFlowStore();
  const onClose = () => setShowSuccessModal(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (!txHash) return;

    const checkConfirmation = async () => {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        await provider.waitForTransaction(txHash);
        setIsConfirmed(true);
      } catch (error) {
        console.error("Error waiting for transaction:", error);
      }
    };
    checkConfirmation();
  }, [txHash]);

  // Get details from the action node to display on receipt
  const actionNode = nodes.find(n => n.data.type === 'action');
  const amount = (actionNode?.data.amount as string) || '0.0001';
  const fromToken = (actionNode?.data.fromToken as string) || 'ETH';
  const toToken = (actionNode?.data.toToken as string) || 'UNI';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-stone-100 p-1.5 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300 relative">
        
        {/* Receipt Card */}
        <div className="bg-white rounded-xl p-6 relative overflow-hidden">
            
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-4 right-4 text-stone-300 hover:text-stone-800 transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

            {/* Header */}
            <div className="flex flex-col items-center mb-6 pt-2">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500 ring-4 ring-green-50/50">
                    <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-stone-900 tracking-tight">Transfer Initiated</h2>
                <p className="text-xs text-stone-500 mt-1 font-medium">Transaction submitted to Sepolia</p>
            </div>

            {/* Receipt Details */}
            <div className="bg-stone-50 rounded-lg border border-stone-100 p-4 mb-5 space-y-3 relative">
                {/* Ticket notches */}
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-r border-stone-100"></div>
                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-l border-stone-100"></div>

                <div className="flex justify-between text-sm items-center">
                    <span className="text-stone-500 text-xs font-medium uppercase tracking-wider">Amount</span>
                    <span className="font-bold text-stone-800 text-lg">{amount} {fromToken}</span>
                </div>
                <div className="w-full border-t border-dashed border-stone-200 my-2"></div>
                <div className="flex justify-between text-sm">
                    <span className="text-stone-500">To Asset</span>
                    <span className="font-medium text-stone-800">{toToken}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Network</span>
                    <span className="font-medium text-stone-800 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                        Sepolia
                    </span>
                </div>
            </div>

            {/* Live Progress */}
            <div className="space-y-3 mb-6 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-medium text-stone-600 line-through decoration-stone-400 decoration-2 opacity-60">Trigger Condition Met</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-medium text-stone-800">Transaction Signed</span>
                </div>
                {isConfirmed ? (
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-bold text-stone-800">Confirmed on Blockchain</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center">
                            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                        </div>
                        <span className="text-xs font-bold text-blue-600">Confirming on Blockchain...</span>
                    </div>
                )}
            </div>

            {/* Action Button */}
            <button 
                onClick={() => txHash && window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')} 
                className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95 text-sm flex items-center justify-center gap-2 group"
            >
                <span>View Receipt</span>
                <Receipt className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </button>
            
            <div className="mt-3 text-center">
                <p className="text-[10px] text-stone-300 font-mono truncate max-w-[200px] mx-auto">
                    Ref: {txHash}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
