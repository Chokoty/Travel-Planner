
import { GoogleGenAI, Type } from "@google/genai";
import { ItineraryData } from "../types";

export const parseItineraryFromImages = async (base64Images: string[]): Promise<ItineraryData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    제공된 여행 일정 캡처 이미지들을 정밀하게 분석하여 통합된 여행 계획 JSON을 생성해주세요.
    
    [핵심 미션]
    1. 일정에 먹는 장소(맛집, 카페)가 많을 경우, 그 사이에 칼로리를 소모할 수 있는 주변 '활동(Activity)' 장소(산책로, 공원, 오름, 등산로 등)를 AI가 적극적으로 추천하여 일정에 끼워 넣어주세요.
    2. 공항(AIRPORT)과 메인 숙소(ACCOMMODATION)는 이미지 내용을 바탕으로 자동 추출하여 카테고리를 정확히 지정해주세요.
    3. 각 장소의 정확한 좌표(lat, lng)를 포함하세요. 거리 계산에 필수입니다.
    
    [데이터 요구사항]
    - 언어: 한국어
    - 카테고리 분류: 맛집, 카페, 명소, 숙소, 공항, 이동, 활동, 기타.
    - 활동(ACTIVITY) 카테고리: 칼로리 소모가 가능한 산책, 등산 등의 추천 장소.
    - 고유 ID (id: 랜덤 문자열).
    - 구조: 'days' 배열(날짜별)과 'unscheduledItems' 배열(보관용).
    
    이미지에 텍스트가 작거나 흐릿해도 문맥을 파악해 최선을 다해 장소명을 복원해주세요.
  `;

  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      mimeType: 'image/png',
      data: base64.split(',')[1],
    },
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        ...imageParts,
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dayNumber: { type: Type.INTEGER },
                date: { type: Type.STRING },
                title: { type: Type.STRING },
                theme: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      time: { type: Type.STRING },
                      location: { type: Type.STRING },
                      category: { type: Type.STRING },
                      memo: { type: Type.STRING },
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER }
                    }
                  }
                }
              }
            }
          },
          unscheduledItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                location: { type: Type.STRING },
                category: { type: Type.STRING },
                memo: { type: Type.STRING },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER }
              }
            }
          }
        },
        required: ["days"]
      }
    },
  });

  const data = JSON.parse(response.text || '{}');
  if (!data.unscheduledItems) data.unscheduledItems = [];
  return data as ItineraryData;
};
