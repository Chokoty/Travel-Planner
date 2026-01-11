
import React, { useEffect, useRef } from 'react';
import { DayItinerary, Category } from '../types';

interface MapViewProps {
  day: DayItinerary;
}

const MapView: React.FC<MapViewProps> = ({ day }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    // Access Leaflet from the global window object
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;
    
    // Filter items with coordinates
    const locations = day.items.filter(item => item.lat && item.lng);
    
    // Initialize map if not already done
    if (!mapRef.current) {
      const initialView: [number, number] = locations.length > 0 
        ? [locations[0].lat!, locations[0].lng!] 
        : [33.3617, 126.5292]; // Default to Jeju Center if no locations
      
      mapRef.current = L.map(mapContainerRef.current).setView(initialView, 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    } else {
      // Clear existing layers for re-render
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
      const isEssential = item.category === Category.ACCOMMODATION || item.category === Category.AIRPORT;
      const isActivity = item.category === Category.ACTIVITY;
      const size = isEssential ? 36 : (isActivity ? 30 : 26);
      
      // Custom marker icon
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${color}; 
            width: ${size}px; 
            height: ${size}px; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 6px 10px rgba(0,0,0,0.4); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-weight: 900; 
            font-size: ${isEssential ? 16 : 13}px;
            transform: ${isEssential || isActivity ? 'translateY(-6px)' : 'none'};
          ">
            ${isEssential ? (item.category === Category.AIRPORT ? '🛫' : '🏠') : (isActivity ? '🏃' : index + 1)}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      L.marker(pos, { icon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 6px; min-width: 140px;">
            <b style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 2px;">${item.location}</b>
            <span style="color: #64748b; font-size: 11px; font-weight: bold;">${item.time} | ${item.category}</span>
            ${item.memo ? `<p style="margin-top: 6px; border-top: 1px solid #f1f5f9; padding-top: 6px; font-style: italic; color: #334155; font-size: 12px; line-height: 1.4;">${item.memo}</p>` : ''}
          </div>
        `);
    });

    // Draw Route Polyline
    if (points.length > 1) {
      const route = L.polyline(points, { color: '#2563eb', weight: 5, opacity: 0.4, dashArray: '10, 15' }).addTo(mapRef.current!);
      mapRef.current!.fitBounds(route.getBounds(), { padding: [80, 80] });
    } else if (points.length === 1) {
      mapRef.current!.setView(points[0], 14);
    }

    // Leaflet needs an invalidation call
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 100);

  }, [day]);

  return (
    <div className="w-full h-[500px] relative rounded-[2.5rem] overflow-hidden border-[8px] border-white shadow-2xl bg-slate-200">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default MapView;
