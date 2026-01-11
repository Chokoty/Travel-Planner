
import React, { useState, useEffect } from 'react';
import { parseItineraryFromImages } from './services/geminiService';
import { ItineraryData, Category, ItineraryItem } from './types';
import RouteVisualizer from './components/RouteVisualizer';
import MapView from './components/MapView';
import TextVersion from './components/TextVersion';

type ViewMode = 'table' | 'text';

interface Essentials {
  airport: string;
  hotel: string;
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [essentials, setEssentials] = useState<Essentials>({ airport: '', hotel: '' });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getDayDistance = (items: ItineraryItem[]) => {
    let total = 0;
    for (let i = 0; i < items.length - 1; i++) {
      const start = items[i];
      const end = items[i + 1];
      if (start.lat && start.lng && end.lat && end.lng) {
        total += calculateDistance(start.lat, start.lng, end.lat, end.lng);
      }
    }
    return total * 1.3; // Road distance estimate factor
  };

  const addItem = (dayIndex: number) => {
    if (!itinerary) return;
    const newItinerary = { ...itinerary };
    const newItem: ItineraryItem = {
      id: Math.random().toString(36).substr(2, 9),
      time: '00:00',
      location: '새 장소',
      category: Category.OTHER,
      memo: '',
    };
    newItinerary.days[dayIndex].items.push(newItem);
    setItinerary(newItinerary);
  };

  const excludeItem = (dayIndex: number, itemIndex: number) => {
    if (!itinerary) return;
    const newItinerary = { ...itinerary };
    const [removed] = newItinerary.days[dayIndex].items.splice(itemIndex, 1);
    newItinerary.unscheduledItems.push(removed);
    setItinerary(newItinerary);
  };

  const includeItem = (unscheduledIndex: number, targetDayIndex: number = 0) => {
    if (!itinerary) return;
    const newItinerary = { ...itinerary };
    const [item] = newItinerary.unscheduledItems.splice(unscheduledIndex, 1);
    if (!item.time) item.time = '10:00';
    newItinerary.days[targetDayIndex].items.push(item);
    setItinerary(newItinerary);
  };

  const moveItem = (dayIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    if (!itinerary) return;
    const newItinerary = { ...itinerary };
    const items = newItinerary.days[dayIndex].items;
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [items[itemIndex], items[targetIndex]] = [items[targetIndex], items[itemIndex]];
    setItinerary(newItinerary);
  };

  const updateItem = (dayIndex: number, itemIndex: number, field: keyof ItineraryItem, value: any) => {
    if (!itinerary) return;
    const newItinerary = { ...itinerary };
    newItinerary.days[dayIndex].items[itemIndex] = { ...newItinerary.days[dayIndex].items[itemIndex], [field]: value };
    setItinerary(newItinerary);
  };

  const cycleCategory = (dayIndex: number, itemIndex: number) => {
    const categories = Object.values(Category);
    const current = itinerary!.days[dayIndex].items[itemIndex].category;
    const nextIndex = (categories.indexOf(current) + 1) % categories.length;
    updateItem(dayIndex, itemIndex, 'category', categories[nextIndex]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setLoading(true); setError(null); setItinerary(null); setShowGallery(false);
    const fileList = Array.from(files) as File[];
    const base64Promises = fileList.map(file => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }));
    try {
      const base64s = await Promise.all(base64Promises);
      setPreviewImages(base64s);
      const data = await parseItineraryFromImages(base64s);
      setItinerary(data);
      
      const allItems = [
        ...data.days.flatMap(d => d.items),
        ...data.unscheduledItems
      ];
      
      const airportItem = allItems.find(i => 
        i.category === Category.AIRPORT || i.location.includes('공항')
      );
      const hotelItem = allItems.find(i => 
        i.category === Category.ACCOMMODATION || i.location.includes('호텔') || i.location.includes('숙소')
      );
      
      setEssentials({ 
        airport: airportItem?.location || '', 
        hotel: hotelItem?.location || '' 
      });
    } catch (err) { setError("이미지 분석 실패"); } finally { setLoading(false); }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case Category.RESTAURANT: return '🟢';
      case Category.CAFE: return '🟡';
      case Category.SIGHT: return '📸';
      case Category.ACCOMMODATION: return '🏠';
      case Category.AIRPORT: return '✈️';
      case Category.ACTIVITY: return '🏃';
      default: return '📍';
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50 text-slate-900">
      <header className="bg-white border-b sticky top-0 z-[1000] px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">AI 여행 루트 플래너</h1>
        </div>
        <div className="flex items-center space-x-3">
          {previewImages.length > 0 && (
            <button onClick={() => setShowGallery(!showGallery)} className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-full font-bold transition-all border border-slate-200">
              {showGallery ? '원본 닫기' : '원본 보기'}
            </button>
          )}
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold cursor-pointer transition-all shadow-lg flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            <span>업로드</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8">
        {itinerary && (
          <div className="space-y-6">
            {/* Essentials & Unscheduled Pool */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="p-1 bg-red-50 rounded text-red-500">📍</span> 주요 거점 설정
                  </h3>
                  <div className="space-y-4">
                    <div className="group">
                      <label className="text-[10px] font-black text-slate-500 mb-1 block ml-1 uppercase">🏠 메인 숙소</label>
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-inner">
                        <span className="text-xl">🏨</span>
                        <input 
                          type="text" 
                          value={essentials.hotel} 
                          onChange={(e) => setEssentials({ ...essentials, hotel: e.target.value })} 
                          placeholder="자동 추출 중..." 
                          className="w-full bg-transparent border-none text-slate-900 text-sm font-bold outline-none placeholder:text-slate-300" 
                        />
                      </div>
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-black text-slate-500 mb-1 block ml-1 uppercase">✈️ 공항/터미널</label>
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-inner">
                        <span className="text-xl">🛫</span>
                        <input 
                          type="text" 
                          value={essentials.airport} 
                          onChange={(e) => setEssentials({ ...essentials, airport: e.target.value })} 
                          placeholder="자동 추출 중..." 
                          className="w-full bg-transparent border-none text-slate-900 text-sm font-bold outline-none placeholder:text-slate-300" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="p-1 bg-amber-50 rounded text-amber-500">📦</span> 보관함 (장소 리스트)
                  </h3>
                  <div className="flex flex-wrap gap-2 min-h-[140px] p-5 bg-slate-50 rounded-[2rem] border border-dashed border-slate-300 overflow-y-auto max-h-[250px] shadow-inner">
                    {itinerary.unscheduledItems.length === 0 && (
                      <div className="w-full flex flex-col items-center justify-center text-slate-400 py-8">
                        <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        <p className="text-[11px] font-bold italic">제외된 장소 보관소</p>
                      </div>
                    )}
                    {itinerary.unscheduledItems.map((item, idx) => (
                      <button 
                        key={item.id} 
                        onClick={() => includeItem(idx)} 
                        className="bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 px-4 py-2 rounded-2xl text-[12px] font-black shadow-sm flex items-center gap-2 transition-all text-slate-700"
                      >
                        <span>{getCategoryEmoji(item.category)}</span>
                        <span className="max-w-[120px] truncate">{item.location}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-md w-fit mx-auto">
              <button onClick={() => setViewMode('table')} className={`px-12 py-3 rounded-xl text-sm font-black transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>일정 상세</button>
              <button onClick={() => setViewMode('text')} className={`px-12 py-3 rounded-xl text-sm font-black transition-all ${viewMode === 'text' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>텍스트 버전</button>
            </div>

            {viewMode === 'text' ? <TextVersion data={itinerary} /> : (
              itinerary.days.map((day, dIdx) => (
                <section key={dIdx} className="bg-white rounded-[3rem] shadow-2xl shadow-slate-300/40 border border-slate-100 overflow-hidden mb-16 animate-in fade-in slide-in-from-bottom-12">
                  <div className="p-10 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white flex justify-between items-end">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-4 py-1.5 bg-white/10 rounded-full text-[11px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border border-white/10">Day {day.dayNumber}</span>
                        <h3 className="text-4xl font-black tracking-tighter">{day.date}</h3>
                      </div>
                      <div className="flex items-center gap-5 mt-4 text-blue-100/80 text-sm font-bold">
                        <span className="flex items-center gap-2"><svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg> {day.theme}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="flex items-center gap-2 font-black text-white"><svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> {getDayDistance(day.items).toFixed(1)}km</span>
                      </div>
                    </div>
                    <button onClick={() => addItem(dIdx)} className="bg-white text-blue-900 px-8 py-4 rounded-2xl text-base font-black flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/20">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                      장소 추가
                    </button>
                  </div>

                  <div className="px-10 py-10 border-b border-slate-50 bg-slate-50/50"><MapView day={day} /></div>
                  <div className="bg-white border-b border-slate-50"><RouteVisualizer day={day} /></div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-100">
                        <tr>
                          <th className="px-10 py-6 w-20"></th>
                          <th className="px-4 py-6 w-32 text-slate-800">시간</th>
                          <th className="px-4 py-6 text-slate-800">장소</th>
                          <th className="px-4 py-6 w-36 text-center text-slate-800">구분</th>
                          <th className="px-4 py-6 text-slate-800">메모 및 꿀팁</th>
                          <th className="px-10 py-6 w-20 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {day.items.map((item, iIdx) => (
                          <React.Fragment key={item.id}>
                            <tr className={`group hover:bg-blue-50/50 transition-all duration-300 ${item.category === Category.ACTIVITY ? 'bg-orange-50/30' : ''}`}>
                              <td className="px-4 py-8">
                                <div className="flex flex-col gap-1 items-center opacity-0 group-hover:opacity-100 transition-all">
                                  <button disabled={iIdx === 0} onClick={() => moveItem(dIdx, iIdx, 'up')} className="text-slate-300 hover:text-blue-600 disabled:opacity-0 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" /></svg></button>
                                  <button disabled={iIdx === day.items.length - 1} onClick={() => moveItem(dIdx, iIdx, 'down')} className="text-slate-300 hover:text-blue-600 disabled:opacity-0 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg></button>
                                </div>
                              </td>
                              <td><input className="bg-transparent border-none focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-2 w-full text-sm font-mono font-black text-slate-500 outline-none" value={item.time} onChange={(e) => updateItem(dIdx, iIdx, 'time', e.target.value)} /></td>
                              <td><input className="bg-transparent border-none focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-2 w-full text-lg font-black text-slate-900 outline-none" value={item.location} onChange={(e) => updateItem(dIdx, iIdx, 'location', e.target.value)} /></td>
                              <td className="text-center">
                                <button onClick={() => cycleCategory(dIdx, iIdx)} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black border shadow-sm transition-all ${
                                  item.category === Category.RESTAURANT ? 'bg-green-100 text-green-800 border-green-200' : 
                                  item.category === Category.CAFE ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                  item.category === Category.ACTIVITY ? 'bg-orange-600 text-white border-orange-700 ring-4 ring-orange-100' : 
                                  'bg-white text-slate-700 border-slate-200'
                                }`}>
                                  {getCategoryEmoji(item.category)} {item.category}
                                </button>
                              </td>
                              <td><input className="bg-transparent border-none focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-2 w-full text-sm text-slate-700 font-bold placeholder:text-slate-200 outline-none" value={item.memo} onChange={(e) => updateItem(dIdx, iIdx, 'memo', e.target.value)} placeholder="꿀팁을 적어보세요..." /></td>
                              <td className="px-6 text-center">
                                <button onClick={() => excludeItem(dIdx, iIdx)} className="text-slate-200 hover:text-red-500 hover:bg-red-50 p-4 rounded-3xl transition-all scale-75 group-hover:scale-100"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                              </td>
                            </tr>
                            {iIdx < day.items.length - 1 && day.items[iIdx].lat && day.items[iIdx+1].lat && (
                              <tr className="bg-slate-50/30">
                                <td colSpan={6} className="px-28 py-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-0.5 h-6 bg-blue-100"></div>
                                    <span className="text-[11px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5 shadow-sm">
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                      차량 이동: 약 {(calculateDistance(day.items[iIdx].lat!, day.items[iIdx].lng!, day.items[iIdx+1].lat!, day.items[iIdx+1].lng!) * 1.3).toFixed(1)}km
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[4rem] border border-slate-100 shadow-2xl shadow-blue-100/50">
            <div className="relative">
              <div className="w-24 h-24 border-[6px] border-blue-600/5 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">👟</div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-10 tracking-tight italic">칼로리를 소모할 추천 활동 장소를 찾는 중...</p>
            <p className="text-slate-400 mt-3 font-black uppercase text-[10px] tracking-[0.4em]">AI Route Optimization System</p>
          </div>
        )}

        {!itinerary && !loading && (
          <div className="bg-white rounded-[4rem] p-32 border-2 border-dashed border-slate-200 flex flex-col items-center text-center shadow-2xl shadow-slate-200/50 mt-16 transition-all hover:border-blue-400 hover:bg-slate-50/30 group">
            <div className="w-36 h-36 bg-blue-50 text-blue-600 rounded-[3rem] flex items-center justify-center mb-12 transform -rotate-6 group-hover:rotate-0 transition-all duration-500 shadow-2xl shadow-blue-100 border-4 border-white">
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-5xl font-black text-slate-900 mb-8 tracking-tighter">여행 캡처본을 올려주세요</h2>
            <p className="text-slate-500 max-w-sm leading-relaxed text-xl font-bold">이미지에서 일정을 뽑아<br/><span className="text-orange-500 underline decoration-4 underline-offset-8">칼로리 소모 장소</span>까지 추천해드릴게요!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
