export interface Biography {
  id: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
  title?: string;
  summary: string;
  fullBio: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  /** When the biography was last edited (ISO string). */
  lastEditedAt?: string;
  /** Email of the user who last edited. */
  lastEditedBy?: string;
}

export type BiographyInput = Omit<Biography, 'id' | 'createdAt' | 'updatedAt'>;
