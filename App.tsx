
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

const MEMBER_PRESETS: Record<string, string[]> = {
  '규문': ['애월 카페거리', '한담해안산책로', '아르떼뮤지엄', '카멜리아 힐', '매일올레시장', '큰엉해안경승지', '감귤따기', '사려니숲길', '성산일출봉'],
  '임재': ['천문과학관', '1100고지', '비밀의 숲', '송악산둘레길', '원앙폭포', '소천지', '청굴물', '서우봉']
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [essentials, setEssentials] = useState<Essentials>({ airport: '', hotel: '' });
  const [members, setMembers] = useState<string[]>(['규문', '임재']);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
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
    return total * 1.3;
  };

  const toggleVote = (dayIndex: number, itemIndex: number, memberName: string) => {
    if (!itinerary) return;
    const newItinerary = { ...itinerary };
    const item = newItinerary.days[dayIndex].items[itemIndex];
    const votes = item.votedBy || [];
    if (votes.includes(memberName)) {
      item.votedBy = votes.filter(v => v !== memberName);
    } else {
      item.votedBy = [...votes, memberName];
    }
    setItinerary(newItinerary);
  };

  const addItem = (dayIndex: number) => {
    if (!itinerary) return;
    const newItinerary = { ...itinerary };
    newItinerary.days[dayIndex].items.push({
      id: Math.random().toString(36).substr(2, 9),
      time: '12:00',
      location: '새로운 장소',
      category: Category.OTHER,
      memo: '',
      votedBy: []
    });
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
    newItinerary.days[targetDayIndex].items.push(item);
    setItinerary(newItinerary);
  };

  const updateItem = (dayIndex: number, itemIndex: number, field: keyof ItineraryItem, value: any) => {
    if (!itinerary) return;
    const newItinerary = { ...itinerary };
    newItinerary.days[dayIndex].items[itemIndex] = { ...newItinerary.days[dayIndex].items[itemIndex], [field]: value };
    setItinerary(newItinerary);
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
      
      // Automatic Interest Matching
      data.days.forEach(day => {
        day.items.forEach(item => {
          item.votedBy = [];
          Object.entries(MEMBER_PRESETS).forEach(([member, keywords]) => {
            if (keywords.some(k => item.location.includes(k))) {
              item.votedBy!.push(member);
            }
          });
        });
      });

      setItinerary(data);
      const allItems = [...data.days.flatMap(d => d.items), ...data.unscheduledItems];
      const airportItem = allItems.find(i => i.category === Category.AIRPORT || i.location.includes('공항'));
      const hotelItem = allItems.find(i => i.category === Category.ACCOMMODATION || i.location.includes('호텔'));
      setEssentials({ airport: airportItem?.location || '', hotel: hotelItem?.location || '' });
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
    <div className="min-h-screen pb-20 bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b sticky top-0 z-[1000] px-6 py-4 flex justify-between items-center shadow-sm backdrop-blur-md bg-white/90">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900">AI TRAVEL ROUTE</h1>
        </div>
        <div className="flex items-center space-x-3">
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-black cursor-pointer transition-all shadow-xl shadow-blue-200 flex items-center space-x-2 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            <span>플랜 생성</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-10">
        {itinerary && (
          <div className="space-y-8">
            {/* Group Members & Essentials Dashboard */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-2xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="p-1.5 bg-blue-50 rounded-lg text-blue-600">👥</span> 우리 팀 멤버
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {members.map(m => (
                      <div key={m} className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm text-slate-700 shadow-sm">
                        <div className={`w-2.5 h-2.5 rounded-full ${m === '규문' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                        {m}
                      </div>
                    ))}
                    <button className="px-4 py-2 border border-dashed border-slate-300 rounded-2xl text-slate-400 text-xs font-bold hover:bg-slate-50 transition-colors">+ 멤버 추가</button>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-1">📍 주요 거점</label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-100 rounded-2xl px-4 py-3 shadow-inner">
                        <span className="text-xl">🏨</span>
                        <input type="text" value={essentials.hotel} onChange={(e) => setEssentials({ ...essentials, hotel: e.target.value })} className="bg-transparent border-none text-slate-900 text-sm font-bold w-full outline-none" placeholder="숙소 자동 추출..." />
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-100 rounded-2xl px-4 py-3 shadow-inner">
                        <span className="text-xl">🛫</span>
                        <input type="text" value={essentials.airport} onChange={(e) => setEssentials({ ...essentials, airport: e.target.value })} className="bg-transparent border-none text-slate-900 text-sm font-bold w-full outline-none" placeholder="공항 자동 추출..." />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="p-1.5 bg-amber-50 rounded-lg text-amber-600">🎒</span> 가고 싶은 곳 보관함
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[280px] overflow-y-auto p-2">
                    {itinerary.unscheduledItems.map((item, idx) => (
                      <div key={item.id} className="relative group">
                        <button onClick={() => includeItem(idx)} className="w-full text-left bg-white border border-slate-200 hover:border-blue-500 p-3 rounded-2xl shadow-sm transition-all group-hover:scale-[1.02]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{getCategoryEmoji(item.category)}</span>
                            <span className="text-xs font-black text-slate-800 truncate">{item.location}</span>
                          </div>
                          {(item.votedBy?.length || 0) > 0 && (
                            <div className="flex gap-1 mt-1">
                              {item.votedBy?.map(v => (
                                <div key={v} className={`w-1.5 h-1.5 rounded-full ${v === '규문' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                              ))}
                            </div>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-3xl border border-slate-200 shadow-xl w-fit mx-auto">
              <button onClick={() => setViewMode('table')} className={`px-12 py-3.5 rounded-[1.25rem] text-sm font-black transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600'}`}>PLANNER</button>
              <button onClick={() => setViewMode('text')} className={`px-12 py-3.5 rounded-[1.25rem] text-sm font-black transition-all ${viewMode === 'text' ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600'}`}>SUMMARY</button>
            </div>

            {viewMode === 'text' ? <TextVersion data={itinerary} /> : (
              itinerary.days.map((day, dIdx) => (
                <section key={dIdx} className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-300/30 border border-slate-100 overflow-hidden mb-16 animate-in fade-in slide-in-from-bottom-12">
                  <div className="p-10 bg-slate-900 text-white flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <span className="px-5 py-2 bg-white/10 rounded-2xl text-xs font-black uppercase tracking-[0.3em] backdrop-blur-xl border border-white/5">Day {day.dayNumber}</span>
                        <h3 className="text-5xl font-black tracking-tighter">{day.date}</h3>
                      </div>
                      <div className="flex items-center gap-6 mt-6 text-slate-400 text-sm font-bold">
                        <span className="flex items-center gap-2"><svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg> {day.theme}</span>
                        <span className="flex items-center gap-2 font-black text-white"><svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> {getDayDistance(day.items).toFixed(1)}km</span>
                      </div>
                    </div>
                    <button onClick={() => addItem(dIdx)} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-[2rem] text-lg font-black flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4" /></svg>
                      ADD STOP
                    </button>
                  </div>

                  <div className="px-10 py-10 bg-slate-50/50"><MapView day={day} /></div>
                  <div className="bg-white border-b border-slate-50"><RouteVisualizer day={day} /></div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] border-b border-slate-100">
                        <tr>
                          <th className="px-10 py-8 w-16"></th>
                          <th className="px-4 py-8 w-28">TIME</th>
                          <th className="px-4 py-8">LOCATION</th>
                          <th className="px-4 py-8 w-32 text-center">CATEGORY</th>
                          <th className="px-4 py-8 w-44">MUST GO (VOTES)</th>
                          <th className="px-4 py-8">MEMO</th>
                          <th className="px-8 py-8 w-16 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {day.items.map((item, iIdx) => {
                          const voteCount = item.votedBy?.length || 0;
                          return (
                            <React.Fragment key={item.id}>
                              <tr className={`group transition-all duration-300 ${voteCount >= 2 ? 'bg-amber-50/30' : 'hover:bg-slate-50/80'}`}>
                                <td className="px-6 py-10">
                                  <div className="flex flex-col gap-1 items-center opacity-0 group-hover:opacity-100 transition-all">
                                    <button disabled={iIdx === 0} onClick={() => updateItem(dIdx, iIdx, 'time', item.time)} className="text-slate-300 hover:text-blue-600 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" /></svg></button>
                                  </div>
                                </td>
                                <td><input className="bg-transparent border-none text-sm font-mono font-black text-slate-400 outline-none w-full" value={item.time} onChange={(e) => updateItem(dIdx, iIdx, 'time', e.target.value)} /></td>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <input className="bg-transparent border-none text-xl font-black text-slate-900 outline-none w-full" value={item.location} onChange={(e) => updateItem(dIdx, iIdx, 'location', e.target.value)} />
                                    {voteCount >= 2 && <span className="text-xl animate-bounce">🔥</span>}
                                    {voteCount === 1 && <span className="text-lg">⭐</span>}
                                  </div>
                                </td>
                                <td className="text-center">
                                  <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black border shadow-sm ${
                                    item.category === Category.RESTAURANT ? 'bg-green-100 text-green-800 border-green-200' : 
                                    item.category === Category.CAFE ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                    item.category === Category.ACTIVITY ? 'bg-orange-600 text-white border-orange-700 shadow-lg shadow-orange-200' : 
                                    'bg-white text-slate-700 border-slate-200'
                                  }`}>
                                    {getCategoryEmoji(item.category)} {item.category}
                                  </div>
                                </td>
                                <td>
                                  <div className="flex gap-2">
                                    {members.map(m => (
                                      <button 
                                        key={m} 
                                        onClick={() => toggleVote(dIdx, iIdx, m)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${
                                          item.votedBy?.includes(m) 
                                            ? (m === '규문' ? 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-200' : 'bg-purple-600 text-white border-purple-700 shadow-lg shadow-purple-200')
                                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                                        }`}
                                      >
                                        {m}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                                <td><input className="bg-transparent border-none text-sm text-slate-500 font-bold placeholder:text-slate-200 outline-none w-full" value={item.memo} onChange={(e) => updateItem(dIdx, iIdx, 'memo', e.target.value)} placeholder="꿀팁 메모..." /></td>
                                <td className="px-6 text-center">
                                  <button onClick={() => excludeItem(dIdx, iIdx)} className="text-slate-200 hover:text-red-500 hover:bg-red-50 p-4 rounded-3xl transition-all scale-75 group-hover:scale-100"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </td>
                              </tr>
                              {iIdx < day.items.length - 1 && day.items[iIdx].lat && day.items[iIdx+1].lat && (
                                <tr className="bg-slate-50/20">
                                  <td colSpan={7} className="px-28 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-[1.5px] h-8 bg-blue-100"></div>
                                      <span className="text-[11px] font-black text-blue-500 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 flex items-center gap-2 shadow-sm">
                                        🚗 약 {(calculateDistance(day.items[iIdx].lat!, day.items[iIdx].lng!, day.items[iIdx+1].lat!, day.items[iIdx+1].lng!) * 1.3).toFixed(1)}km 이동
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[4rem] border border-slate-100 shadow-2xl shadow-blue-100/50">
            <div className="relative">
              <div className="w-32 h-32 border-[8px] border-blue-600/5 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">🗺️</div>
            </div>
            <p className="text-3xl font-black text-slate-900 mt-12 tracking-tighter italic">우리 팀의 취향을 분석하고 있습니다...</p>
          </div>
        )}

        {!itinerary && !loading && (
          <div className="bg-white rounded-[5rem] p-40 border-4 border-dashed border-slate-200 flex flex-col items-center text-center shadow-2xl shadow-slate-200/50 mt-16 transition-all hover:border-blue-500 hover:bg-blue-50/10 group">
            <div className="w-44 h-44 bg-blue-600 text-white rounded-[4rem] flex items-center justify-center mb-16 transform -rotate-12 group-hover:rotate-0 transition-all duration-700 shadow-[0_35px_60px_-15px_rgba(37,99,235,0.3)] border-[10px] border-white">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            </div>
            <h2 className="text-6xl font-black text-slate-900 mb-10 tracking-tighter">캡처 한 장으로 끝내는<br/><span className="text-blue-600">팀 스마트 루트</span></h2>
            <p className="text-slate-500 max-w-lg leading-relaxed text-2xl font-bold">규문, 임재 님의 취향을 자동으로 분석하고<br/>최적화된 칼로리 소모 동선을 제안합니다.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
