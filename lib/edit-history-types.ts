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

export type DeleteHistoryRange = '1h' | '1d' | '7d' | '30d' | 'all';

export interface DeleteHistoryOptions {
  range: DeleteHistoryRange;
  userEmail?: string;
}
