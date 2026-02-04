// app/store/useFlowStore.ts
import { create } from 'zustand';
import {
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';

export type Recipient = {
  address: string;
  amount: string | number;
  input?: string;
};

export type NodeData = {
  label: string;
  type?: 'action' | 'transfer' | 'ens';
  active?: boolean;

  // Uniswap
  input?: string;
  output?: string;
  amount?: string | number;
  amountType?: string;

  // Arc Payroll
  recipients?: Recipient[];
  memo?: string;

  // Legacy / Other
  value?: number;
  percentage?: number;
  address?: string;
  fromToken?: string;
  toToken?: string;
  contractCall?: {
    target: string;
    data: string;
  };
  target?: string;
  data?: string;
};

export type FlowNode = Node<NodeData>;
export type FlowEdge = Edge;

interface FlowState {
  // React Flow State
  nodes: FlowNode[];
  edges: FlowEdge[];

  // App State
  currentPrice: number;
  isRunning: boolean;
  walletAddress: string | null;
  txHash: string | null;
  executionStep: number | null;
  executionError: string | null;

  // Modals State
  showSuccessModal: boolean;
  showAIModal: boolean;

  // Actions
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  setCurrentPrice: (price: number) => void;
  setIsRunning: (isRunning: boolean) => void;
  setWalletAddress: (address: string | null) => void;
  setTxHash: (hash: string | null) => void;
  setExecutionStep: (step: number | null) => void;
  setExecutionError: (error: string | null) => void;
  setShowSuccessModal: (show: boolean) => void;
  setShowAIModal: (show: boolean) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  resetFlow: () => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  currentPrice: 0,
  isRunning: false,
  walletAddress: null,
  txHash: null,
  showSuccessModal: false,
  showAIModal: false,
  executionStep: null,
  executionError: null,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as FlowNode[],
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setCurrentPrice: (currentPrice) => set({ currentPrice }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setWalletAddress: (walletAddress) => set({ walletAddress }),
  setTxHash: (txHash) => set({ txHash }),
  setShowSuccessModal: (showSuccessModal) => set({ showSuccessModal }),
  setShowAIModal: (showAIModal) => set({ showAIModal }),
  setExecutionStep: (executionStep) => set({ executionStep }),
  setExecutionError: (executionError) => set({ executionError }),
  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          // creating a new object for state update
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },
  resetFlow: () => set({ nodes: [], edges: [] }),
}));

export const usePriceStore = create(() => ({
  currentPrice: 0,
}));
