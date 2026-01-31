// app/components/modals/AIModal.tsx
import React, { useState } from 'react';
import { X, Sparkles, Check, Circle, Loader2, BrainCircuit } from 'lucide-react';
import { MarkerType } from '@xyflow/react';
import { useFlowStore } from '../../store/useFlowStore';
import { analyzeIntent } from '../../actions';

export const AIModal = () => {
  const { setShowAIModal, setNodes, setEdges } = useFlowStore();
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
        const result = await analyzeIntent(intent);
        
        if (result && !result.error) {
            // Typewriter effect for thoughts (Step 0)
            const rawThoughts = result.thought || "Processing request...";
            const sentences = rawThoughts.match(/[^.!?]+[.!?]+/g) || [rawThoughts];
            
            for (const sentence of sentences) {
                const text = sentence.trim();
                if (!text) continue;

                // Type in
                for (let i = 0; i <= text.length; i++) {
                    setThoughtText(text.slice(0, i));
                    await new Promise(r => setTimeout(r, 30)); 
                }
                await new Promise(r => setTimeout(r, 1000)); // Read delay

                // Delete out
                for (let i = text.length; i >= 0; i--) {
                    setThoughtText(text.slice(0, i));
                    await new Promise(r => setTimeout(r, 10));
                }
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
      const nodesToAdd = [];
      const edgesToAdd = [];

      // 1. Create Trigger
      const triggerId = `trigger-${Date.now()}`;
      const triggerNode = {
          id: triggerId,
          type: 'custom',
          position: { x: 100, y: 100 },
          data: {
              label: 'Price Trigger',
              type: 'trigger',
              operator: result.trigger.operator,
              threshold: result.trigger.threshold.toString()
          }
      };
      nodesToAdd.push(triggerNode);

      // 2. Create Action
      const actionId = `action-${Date.now()}`;
      const actionNode = {
          id: actionId,
          type: 'custom',
          position: { x: 100, y: 350 },
          data: {
              label: 'Uniswap Action',
              type: 'action',
              fromToken: result.action.fromToken,
              toToken: result.action.toToken,
              amountType: result.action.amountType,
              amount: String(result.action.amount)
          }
      };
      nodesToAdd.push(actionNode);

      // 3. Create Edge 1 (Trigger -> Action)
      const edge1 = {
          id: `${triggerId}-${actionId}`,
          source: triggerId,
          target: actionId,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      };
      edgesToAdd.push(edge1);

      // 4. Check for and create Transfer node and edge
      if (result.transfer && result.transfer.recipient) {
        const transferId = `transfer-${Date.now()}`;
        const transferNode = {
            id: transferId,
            type: 'custom',
            position: { x: 100, y: 600 },
            data: {
                label: 'Transfer',
                type: 'transfer',
                recipient: result.transfer.recipient
            }
        };
        nodesToAdd.push(transferNode);

        const edge2 = {
            id: `${actionId}-${transferId}`,
            source: actionId,
            target: transferId,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        };
        edgesToAdd.push(edge2);
      }

      setNodes(nodesToAdd);
      setEdges(edgesToAdd);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-black">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-100 p-2 rounded-full">
              <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-stone-800">AI Agent Builder</h2>
        </div>
        
        {isProcessing ? (
            <div className="py-6 px-2 flex flex-col gap-4">
                {steps.map((s, i) => (
                    <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-500">
                            <div className={`p-1 rounded-full transition-colors duration-300 ${
                                i < step ? 'bg-green-100 text-green-600' : 
                                i === step ? 'bg-purple-100 text-purple-600' : 
                                'bg-stone-100 text-stone-300'
                            }`}>
                                {i < step ? <Check className="w-4 h-4" /> : 
                                 i === step ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                                 <Circle className="w-4 h-4" />}
                            </div>
                            <span className={`text-sm transition-colors duration-300 ${
                                i <= step ? 'text-stone-800 font-medium' : 'text-stone-400'
                            }`}>{s}</span>
                        </div>
                        {/* Typewriter area for Step 0 */}
                        {i === 0 && step === 0 && (
                            <div className="ml-9 min-h-[3rem] text-xs text-stone-500 font-mono leading-relaxed relative">
                                <span className="text-purple-600 mr-1 font-bold">AI:</span>
                                {thoughtText}
                                <span className="animate-pulse inline-block w-1.5 h-3 bg-purple-400 ml-1 align-middle"></span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <>
                <p className="text-stone-600 mb-4 text-sm">
                  Describe what you want to do, and I'll build the workflow for you.
                </p>
                <textarea
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm focus:outline-none focus:border-purple-500 min-h-[100px] mb-4 resize-none"
                    placeholder="e.g. If ETH price goes above 3500, swap all ETH to UNI..."
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    disabled={isProcessing}
                />
                <button
                    onClick={handleAnalyze}
                    disabled={isProcessing || !intent.trim()}
                    className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 transition shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
