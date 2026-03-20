import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Label } from 'recharts';
import { PriceData, Prediction } from '../types';

export function PriceChart({ data, activePredictions, cycleStartPrice }: { 
  data: PriceData[], 
  activePredictions: Prediction[],
  cycleStartPrice: number | null
}) {
  const currentPrice = data.length > 0 ? data[data.length - 1].price : 0;
  const isAbove = cycleStartPrice ? currentPrice >= cycleStartPrice : true;
  const chartColor = isAbove ? '#10b981' : '#f43f5e'; // emerald-500 vs rose-500

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || 10;

  const pendingPredictions = activePredictions.filter(p => p.status === 'pending');

  return (
    <div className="h-[400px] w-full bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full blur-[120px] pointer-events-none transition-colors duration-500" 
        style={{ backgroundColor: `${chartColor}10` }}
      />
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="rgba(255,255,255,0.03)" 
          />
          <XAxis 
            dataKey="time" 
            hide 
          />
          <YAxis 
            domain={[minPrice - padding, maxPrice + padding]} 
            orientation="right"
            tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }}
            tickFormatter={(val) => `$${val.toLocaleString()}`}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#151619', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
            itemStyle={{ color: chartColor, fontWeight: 'bold' }}
            labelStyle={{ display: 'none' }}
            formatter={(val: number) => [`$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'BTC Price']}
          />
          
          {cycleStartPrice && (
            <ReferenceLine 
              y={cycleStartPrice} 
              stroke="#ffffff" 
              strokeDasharray="3 3"
              strokeOpacity={0.2}
            >
              <Label 
                value="CYCLE START" 
                position="insideTopLeft" 
                fill="#ffffff"
                fontSize={9}
                fontWeight="bold"
                opacity={0.4}
              />
            </ReferenceLine>
          )}

          {pendingPredictions.map(p => (
            <ReferenceLine 
              key={p.id}
              y={p.startPrice} 
              stroke={p.direction === 'up' ? '#10b981' : '#f43f5e'} 
              strokeDasharray="5 5"
              strokeWidth={1.5}
            >
              <Label 
                value={`ENTRY: $${p.startPrice.toLocaleString()}`} 
                position="left" 
                fill={p.direction === 'up' ? '#10b981' : '#f43f5e'}
                fontSize={10}
                fontWeight="bold"
              />
            </ReferenceLine>
          ))}

          {data.length > 0 && (
            <ReferenceLine 
              y={data[data.length - 1].price} 
              stroke={chartColor} 
              strokeDasharray="2 2"
              strokeOpacity={0.5}
            >
              <Label 
                value={`LIVE: $${data[data.length - 1].price.toLocaleString()}`} 
                position="right" 
                fill={chartColor}
                fontSize={9}
                fontWeight="bold"
              />
            </ReferenceLine>
          )}

          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={chartColor} 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorPrice)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
