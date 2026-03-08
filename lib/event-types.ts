export interface Event {
  id: string;
  title?: string;
  date?: string;
  place?: string;
  description: string;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
}

export type EventInput = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
