
export type EventType = 'work' | 'study' | 'health' | 'personal' | 'leisure' | 'other';
export type EventStatus = 'scheduled' | 'completed' | 'failed' | 'moved';

export interface CalendarEvent {
  id: string;
  title: string;
  descriptionPoints?: string[];
  start: string;
  end: string;
  allDay: boolean;
  type: EventType;
  categoryLabel?: string; // Etiqueta específica de la categoría personalizada
  status: EventStatus;
  location?: string;
  attendees?: string[];
  color?: string; // Color personalizado opcional para esta actividad específica
  creationSource?: 'manual' | 'voice' | 'ai_suggestion' | 'automation';
  emotionalImpact?: 'stress' | 'relief' | 'neutral';
  recurrenceId?: string;
}

export interface CategoryStyle {
  type: EventType;
  label: string;
  icon: string; // Lucide icon name or similar
  color: string;
}

export interface PlannerTemplate {
  id: string;
  name: string;
  categories: CategoryStyle[];
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

export interface KPIStats {
  completed: number;
  failed: number;
  moved: number;
  streak: number;
  distribution: Record<EventType, number>;
  timeSavedMinutes: number;
  efficiencyImprovement: number;
  stressLevel: number;
}

export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: number;
}

export interface Friend {
  id: string; // The user ID
  name: string;
  handle: string;
  avatar?: string;
  status: 'pending' | 'friend' | 'suggested';
  friendshipId?: string; // The ID of the row in the friends table
  mutualFriends?: number;
}

// Action structure for the Tool
export interface CalendarAction {
  actionType: 'create' | 'update' | 'delete' | 'move';
  eventId?: string; // Required for update, delete, move
  replaceEventId?: string; // NUEVO: Para resolver conflictos, ID del evento a reemplazar
  eventData?: Partial<CalendarEvent>;
}
