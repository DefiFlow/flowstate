// app/components/modals/AIModal.tsx
import React, { useState } from 'react';
import { X, Sparkles, Check, Circle, Loader2, BrainCircuit } from 'lucide-react';
import { MarkerType } from '@xyflow/react';
import { useFlowStore } from '../../store/useFlowStore';
import { analyzeIntent } from '../../actions';

export const AIModal = () => {
    const { setShowAIModal, setNodes, setEdges, currentPrice } = useFlowStore();
    const onClose = () => setShowAIModal(false);

    const [intent, setIntent] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState(0);
    const [thoughtText, setThoughtText] = useState("");

    const steps = [
        "Analyzing user intent...",
        "Extracting DeFi parameters...",
        "Checking market conditions...",
        "Constructing workflow..."
    ];

    const handleAnalyze = async () => {
        if (!intent.trim()) return;
        setIsProcessing(true);
        setStep(0);
        setThoughtText("");

        try {
            const result = await analyzeIntent(intent, currentPrice);

            if (result && !result.error) {
                // Display thoughts without typewriter effect (Step 0)
                const rawThoughts = result.thought || "Processing request...";
                const sentences = rawThoughts.match(/[^.!?]+[.!?]+/g) || [rawThoughts];

                for (const sentence of sentences) {
                    const text = sentence.trim();
                    if (!text) continue;

                    // Directly set thought text to trigger fade-in-up animation
                    setThoughtText(text);
                    // Wait for reading - giving enough time to admire the animation
                    await new Promise(r => setTimeout(r, 2500));
                }

                // Proceed to next steps
                setStep(1);
                await new Promise(r => setTimeout(r, 800));
                setStep(2);
                await new Promise(r => setTimeout(r, 800));
                setStep(3);
                await new Promise(r => setTimeout(r, 800));

                // Finish - Call the callback passed via props or store
                // Since we are decoupling, we might need to pass the result back to the main component
                // or update the store directly here.
                // Let's update the store directly.
                updateFlowFromAI(result);
                onClose();
            } else {
                alert("Failed to parse intent. Please try again.");
                setIsProcessing(false);
            }
        } catch (e) {
            console.error(e);
            alert("Error connecting to AI.");
            setIsProcessing(false);
        }
    };

    const updateFlowFromAI = (result: any) => {
        if (result.nodes && result.edges) {
            // Ensure all nodes use the 'custom' type to match FlowBuilder configuration
            const formattedNodes = result.nodes.map((node: any) => ({
                ...node,
                type: 'custom'
            }));
            setNodes(formattedNodes);
            setEdges(result.edges);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div
                className="rounded-xl p-6 shadow-2xl max-w-md w-full relative animate-in zoom-in-95 duration-300"
                style={{ background: 'linear-gradient(90deg, #5F2AFF 0%, #B800D8 100%)' }}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white/20 p-2 rounded-full">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">AI Agent Builder</h2>
                </div>

                {isProcessing ? (
                    <div className="py-6 px-2 flex flex-col gap-4">
                        {steps.map((s, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-500">
                                    <div className={`p-1 rounded-full transition-colors duration-300 ${i < step ? 'bg-green-100 text-green-600' :
                                        i === step ? 'bg-white/30 text-white' :
                                            'bg-white/10 text-white/40'
                                        }`}>
                                        {i < step ? <Check className="w-4 h-4" /> :
                                            i === step ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                                <Circle className="w-4 h-4" />}
                                    </div>
                                    <span className={`text-sm transition-colors duration-300 ${i <= step ? 'text-white font-medium' : 'text-white/50'
                                        }`}>{s}</span>
                                </div>
                                {/* Gemini-style Thought Display (Step 0) */}
                                {i === 0 && step === 0 && (
                                    <div className="ml-9 min-h-[3rem] relative overflow-hidden">
                                        <div key={thoughtText} className="text-xs font-mono leading-relaxed animate-in slide-in-from-bottom-2 duration-500 fill-mode-forwards">
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-white font-bold mr-2">AI:</span>
                                            <span
                                                className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-transparent animate-text-shimmer"
                                            >
                                                {thoughtText}
                                            </span>
                                        </div>
                                        {/* Gemini-style shimmering loading bar */}
                                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-50 animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <p className="text-white/90 mb-4 text-sm">
                            Describe what you want to do, and I'll build the workflow for you.
                        </p>
                        <textarea
                            className="w-full border border-white/20 rounded-lg p-3 text-sm focus:outline-none focus:border-white/40 min-h-[100px] mb-4 resize-none text-white placeholder-white/50"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            placeholder="e.g. Swap 1 ETH to USDC, resolve vitalik.eth, and pay salary on Arc..."
                            value={intent}
                            onChange={(e) => setIntent(e.target.value)}
                            disabled={isProcessing}
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={isProcessing || !intent.trim()}
                            className="w-full py-2.5 rounded-lg font-bold transition shadow-lg text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed text-purple-600"
                            style={{
                                backgroundColor: '#FFFFFF',
                                opacity: intent.trim() ? 1 : 0.5
                            }}
                        >
                            <BrainCircuit className="w-4 h-4" />
                            Generate Workflow
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
