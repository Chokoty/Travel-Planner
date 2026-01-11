
import React from 'react';
import { ItineraryData, Category } from '../types';

interface TextVersionProps {
  data: ItineraryData;
}

const TextVersion: React.FC<TextVersionProps> = ({ data }) => {
  const generateText = () => {
    let text = `✈️ ${data.title || '나의 여행 일정'}\n\n`;
    
    data.days.forEach(day => {
      text += `📅 ${day.dayNumber}일차: ${day.date} ${day.title ? `- ${day.title}` : ''}\n`;
      if (day.theme) text += `테마: ${day.theme}\n`;
      text += `시간 | 장소 | 구분 | 꿀팁 및 메모\n`;
      text += `---|---|---|---\n`;
      
      day.items.forEach(item => {
        const emoji = item.category === Category.RESTAURANT ? '🟢' : 
                      (item.category === Category.CAFE || item.category === Category.SIGHT ? '🟡' : '📍');
        text += `${item.time} | ${item.location} | ${emoji} ${item.category} | ${item.memo || '-'}\n`;
      });
      text += `\n`;
    });
    
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    alert('일정이 클립보드에 복사되었습니다!');
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">텍스트 버전 (복사용)</h3>
        <button 
          onClick={handleCopy}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          전체 복사하기
        </button>
      </div>
      <pre className="bg-slate-50 p-6 rounded-2xl text-sm font-mono text-gray-700 overflow-x-auto leading-relaxed whitespace-pre-wrap">
        {generateText()}
      </pre>
    </div>
  );
};

export default TextVersion;
