
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
    <div className="relative py-12 px-6 overflow-x-auto bg-slate-50/50">
      <div className="flex items-center min-w-max space-x-16 px-10">
        {items.map((item, index) => (
          <div key={index} className="flex flex-col items-center relative group">
            {/* Connecting Line */}
            {index < items.length - 1 && (
              <div className="absolute top-7 left-[50%] w-[calc(100%+4rem)] h-1 bg-slate-200 -z-10 group-hover:bg-blue-100 transition-colors"></div>
            )}
            
            <div className={`
              w-14 h-14 rounded-full flex items-center justify-center text-white font-black shadow-xl mb-4 transition-all cursor-default
              ${getCategoryColor(item.category)}
              ${item.category === Category.AIRPORT || item.category === Category.ACCOMMODATION || item.category === Category.ACTIVITY ? 'ring-4 ring-white scale-125' : 'hover:scale-110'}
            `}>
              {item.category === Category.AIRPORT ?