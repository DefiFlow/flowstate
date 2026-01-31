// app/components/flow/PriceTicker.tsx
import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export const PriceTicker = () => {
  const setCurrentPrice = useFlowStore((state) => state.setCurrentPrice);
  const [priceStr, setPriceStr] = useState("0.00");
  const [trend, setTrend] = useState<'up' | 'down'>('up');

  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/ethusdt@trade');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string);
      const current = parseFloat(data.p);
      
      setPriceStr((prev) => {
        const prevPrice = parseFloat(prev);
        setTrend(current > prevPrice ? 'up' : 'down');
        return current.toFixed(2);
      });
      
      setCurrentPrice(current);
    };
    return () => ws.close();
  }, [setCurrentPrice]);

  return (
    <div className="flex items-center gap-3 bg-stone-900 text-white px-4 py-1.5 rounded-full border border-stone-700 shadow-inner">
      <div className="flex items-center gap-2 border-r border-stone-700 pr-3">
        <Activity className={`w-4 h-4 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
        <span className="font-bold text-xs text-stone-400">ETH/USDT</span>
      </div>
      <span className={`font-mono text-lg font-bold ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
        ${priceStr}
      </span>
    </div>
  );
};
