
export enum Category {
  RESTAURANT = '맛집',
  CAFE = '카페',
  SIGHT = '명소',
  ACCOMMODATION = '숙소',
  AIRPORT = '공항',
  TRANSPORT = '이동',
  ACTIVITY = '활동',
  OTHER = '기타'
}

export interface ItineraryItem {
  id: string;
  time: string;
  location: string;
  category: Category;
  memo: string;
  lat?: number;
  lng?: number;
  votedBy?: string[]; // New field for group member votes
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  title: string;
  theme: string;
  items: ItineraryItem[];
}

export interface ItineraryData {
  title: string;
  days: DayItinerary[];
  unscheduledItems: ItineraryItem[];
}
