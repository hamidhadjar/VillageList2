export type EditAction = 'create' | 'update' | 'delete';
export type EntityType = 'biography' | 'event' | 'user';

export interface EditHistoryEntry {
  id: string;
  userEmail: string;
  userRole?: string;
  action: EditAction;
  entityType: EntityType;
  entityId?: string;
  entityLabel?: string;
  createdAt: string;
}

export interface EditHistoryInput {
  userEmail: string;
  userRole?: string;
  action: EditAction;
  entityType: EntityType;
  entityId?: string;
  entityLabel?: string;
}
