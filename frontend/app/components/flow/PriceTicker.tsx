// app/components/flow/PriceTicker.tsx
import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';

export const PriceTicker = () => {
  const setCurrentPrice = useFlowStore((state) => state.setCurrentPrice);
  const [priceStr, setPriceStr] = useState("0.00");
  const [trend, setTrend] = useState<'up' | 'down'>('up');

  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/ethusdc@trade');
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
    <div className="flex items-center gap-3 bg-stone-900 text-white px-4 py-1.5 rounded-full shadow-inner">
      <div className="flex items-center gap-2 pr-3">
        <Activity
          className="w-4 h-4"
          style={{ color: trend === 'up' ? '#22c55e' : '#FF164D' }}
        />
        <span className="font-bold text-xs text-stone-400">ETH/USDC</span>
      </div>
      <div className="w-[1px] h-4 bg-stone-700" />
      <span
        className="font-mono text-lg font-bold"
        style={{ color: trend === 'up' ? '#4ade80' : '#FF164D' }}
      >
        ${priceStr}
      </span>
    </div>
  );
};
