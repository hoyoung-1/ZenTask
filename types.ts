
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  dueDate?: string; // YYYY-MM-DD 형식의 문자열
  dueTime?: string; // HH:mm 형식의 문자열
  notified?: boolean; // 알림 발송 여부
}

export type FilterType = 'all' | 'active' | 'completed';

export interface AssistantResponse {
  motivation: string;
  tip: string;
}
