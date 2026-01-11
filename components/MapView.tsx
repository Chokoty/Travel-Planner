
import React, { useEffect, useRef } from 'react';
import { DayItinerary, Category } from '../types';

interface MapViewProps {
  day: DayItinerary;
}

const MapView: React.FC<MapViewProps> = ({ day }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;
    
    const locations = day.items.filter(item => item.lat && item.lng);
    
    if (!mapRef.current) {
      const initialView: [number, number] = locations.length > 0 
        ? [locations[0].lat!, locations[0].lng!] 
        : [33.3617, 126.5292];
      
      mapRef.current = L.map(mapContainerRef.current).setView(initialView, 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    } else {
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          mapRef.current?.removeLayer(layer);
        }
      });
    }

    if (locations.length === 0) return;

    const points: any[] = [];
    const colors: Record<string, string> = {
      [Category.RESTAURANT]: '#22c55e',
      [Category.CAFE]: '#facc15',
      [Category.SIGHT]: '#3b82f6',
      [Category.ACCOMMODATION]: '#4f46e5',
      [Category.AIRPORT]: '#f97316',
      [Category.ACTIVITY]: '#ea580c',
      'default': '#94a3b8'
    };

    locations.forEach((item, index) => {
      const pos: [number, number] = [item.lat!, item.lng!];
      points.push(pos);

      const color = colors[item.category] || colors.default;
      const voteCount = item.votedBy?.length || 0;
      const isEssential = item.category === Category.ACCOMMODATION || item.category === Category.AIRPORT;
      const isActivity = item.category === Category.ACTIVITY;
      const size = voteCount >= 2 ? 42 : (isEssential ? 36 : 30);
      
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${color}; 
            width: ${size}px; 
            height: ${size}px; 
            border-radius: 12px; 
            border: 4px solid white; 
            box-shadow: 0 10px 20px rgba(0,0,0,0.3); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-weight: 900; 
            font-size: ${isEssential ? 18 : 14}px;
            transform: translateY(-8px);
            position: relative;
          ">
            ${isEssential ? (item.category === Category.AIRPORT ? '🛫' : '🏠') : (isActivity ? '🏃' : index + 1)}
            ${voteCount > 0 ? `
              <div style="
                position: absolute;
                top: -12px;
                right: -12px;
                background: #fff;
                color: #000;
                font-size: 10px;
                padding: 2px 5px;
                border-radius: 5px;
                border: 1px solid #eee;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              ">🔥 ${voteCount}</div>
            ` : ''}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const votesHtml = item.votedBy?.map(v => 
        `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${v === '규문' ? '#3b82f6' : '#a855f7'}; margin-right:4px;"></span>`
      ).join('') || '';

      L.marker(pos, { icon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="font-family: 'Inter', sans-serif; padding: 10px; min-width: 160px; border-radius: 15px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              ${votesHtml}
              <b style="color: #0f172a; font-size: 16px; font-weight: 900;">${item.location}</b>
            </div>
            <span style="color: #64748b; font-size: 11px; font-weight: 800; background: #f8fafc; padding: 2px 6px; border-radius: 4px;">${item.time} | ${item.category}</span>
            ${item.memo ? `<p style="margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px; font-style: italic; color: #475569; font-size: 12px; line-height: 1.5;">${item.memo}</p>` : ''}
          </div>
        `);
    });

    if (points.length > 1) {
      const route = L.polyline(points, { color: '#0f172a', weight: 6, opacity: 0.2, dashArray: '12, 18' }).addTo(mapRef.current!);
      mapRef.current!.fitBounds(route.getBounds(), { padding: [100, 100] });
    } else if (points.length === 1) {
      mapRef.current!.setView(points[0], 15);
    }

    setTimeout(() => mapRef.current?.invalidateSize(), 200);

  }, [day]);

  return (
    <div className="w-full h-[550px] relative rounded-[3.5rem] overflow-hidden border-[12px] border-white shadow-[0_35px_60px_-15px_rgba(0,0,0,0.2)] bg-slate-200">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default MapView;
