export interface Event {
  id: string;
  date?: string;
  place?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type EventInput = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
