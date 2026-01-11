
import React from 'react';
import { DayItinerary, Category } from '../types';

interface RouteVisualizerProps {
  day: DayItinerary;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case Category.RESTAURANT: return 'bg-green-500';
    case Category.CAFE: return 'bg-yellow-400';
    case Category.SIGHT: return 'bg-blue-500';
    case Category.ACCOMMODATION: return 'bg-indigo-600';
    case Category.AIRPORT: return 'bg-orange-500';
    case Category.ACTIVITY: return 'bg-orange-600';
    default: return 'bg-slate-400';
  }
};

const RouteVisualizer: React.FC<RouteVisualizerProps> = ({ day }) => {
  const items = day.items;

  return (
    <div className="relative py-14 px-8 overflow-x-auto bg-slate-50/30">
      <div className="flex items-center min-w-max space-x-20 px-12">
        {items.map((item, index) => {
          const voteCount = item.votedBy?.length || 0;
          return (
            <div key={index} className="flex flex-col items-center relative group">
              {/* Connecting Line */}
              {index < items.length - 1 && (
                <div className="absolute top-8 left-[50%] w-[calc(100%+5rem)] h-1.5 bg-slate-100 -z-10 group-hover:bg-blue-200 transition-all duration-500"></div>
              )}
              
              <div className={`
                w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white font-black shadow-2xl mb-5 transition-all cursor-default relative
                ${getCategoryColor(item.category)}
                ${voteCount >= 2 ? 'ring-8 ring-amber-400/20 scale-125' : 'hover:scale-110'}
              `}>
                {item.category === Category.AIRPORT ? '🛫' : 
                 item.category === Category.ACCOMMODATION ? '🏠' : 
                 item.category === Category.ACTIVITY ? '🏃' :
                 index + 1}

                {/* Vote Indicator */}
                {voteCount > 0 && (
                  <div className="absolute -top-3 -right-3 bg-white text-slate-900 text-[10px] font-black px-2 py-1 rounded-lg shadow-xl border border-slate-100 flex items-center gap-1">
                    🔥 {voteCount}
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-[11px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">{item.time}</p>
                <p className="text-sm font-black text-slate-900 max-w-[120px] leading-tight" title={item.location}>
                  {item.location}
                </p>
                <div className="flex gap-1 justify-center mt-2">
                  {item.votedBy?.map(v => (
                    <div key={v} className={`w-2 h-2 rounded-full ${v === '규문' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RouteVisualizer;
