// app/components/modals/SuccessModal.tsx
import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Receipt } from 'lucide-react';
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

    // 从 action 节点获取详情
    const actionNode = nodes.find(n => (n.data as any)?.type === 'action');
    const amount = ((actionNode?.data as any)?.amount as string) || '0.0001';
    const fromToken = ((actionNode?.data as any)?.fromToken as string) || 'ETH';
    const toToken = ((actionNode?.data as any)?.toToken as string) || 'BTC';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
            <div className="bg-[#121314] border border-[#2A2B32] p-8 rounded-[32px] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300 relative">

                {/* 关闭按钮 */}
                <button onClick={onClose} className="absolute top-6 right-6 text-stone-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                {/* 头部状态 */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-[#00E676] rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(0,230,118,0.3)]">
                        <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Transfer Initiated</h2>
                    <p className="text-sm text-stone-400 mt-1">Transaction submitted to Sepolia</p>
                </div>

                {/* 详情卡片 */}
                <div className="bg-[#08090A] rounded-2xl border border-[#2A2B32] p-5 mb-8 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-stone-500 text-[10px] uppercase font-bold tracking-widest">Amount</span>
                        <span className="font-bold text-white text-base">{amount} {fromToken}</span>
                    </div>
                    <div className="w-full border-t border-[#1A1D24]"></div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500 text-[10px] uppercase font-bold tracking-widest">To Asset</span>
                        <span className="font-bold text-white uppercase">{toToken}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500 text-[10px] uppercase font-bold tracking-widest">Network</span>
                        <span className="font-bold text-white">Sepolia</span>
                    </div>
                </div>

                {/* 步骤列表 */}
                <div className="space-y-4 mb-10 ml-1">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#00E676] flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-white">Trigger Condition Met</span>
                    </div>
                    <div className="flex items-center gap-3 text-white">
                        <div className="w-5 h-5 rounded-full border-2 border-[#52BDFF] flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full border-2 border-[#52BDFF] border-t-transparent animate-spin"></div>
                        </div>
                        <span className="text-sm font-bold text-white">Transaction Signed</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-stone-700"></div>
                        </div>
                        <span className="text-sm font-bold text-stone-500">Confirming on Blockchain...</span>
                    </div>
                </div>

                {/* 操作按钮 */}
                <button
                    onClick={() => txHash && window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
                    className="w-full bg-white text-black py-4 rounded-2xl font-black hover:bg-stone-200 transition-all shadow-lg active:scale-95 text-sm flex items-center justify-center gap-2"
                >
                    View Receipt <Receipt className="w-4 h-4" />
                </button>

                <div className="mt-5 text-center">
                    <p className="text-[10px] text-stone-600 font-mono">
                        Ref {txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : '0x98db091b78rdbe8e07ee3910h'}
                    </p>
                </div>
            </div>
        </div>
    );
};
