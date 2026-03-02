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
}

export type BiographyInput = Omit<Biography, 'id' | 'createdAt' | 'updatedAt'>;
