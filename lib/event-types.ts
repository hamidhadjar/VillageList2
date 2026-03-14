export interface Event {
  id: string;
  title?: string;
  date?: string;
  place?: string;
  /** GPS latitude of the event location (for map). */
  eventLat?: number;
  /** GPS longitude of the event location (for map). */
  eventLng?: number;
  description: string;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
}

export type EventInput = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
