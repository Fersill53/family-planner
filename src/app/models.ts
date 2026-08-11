export interface FamilyMember {
  uid: string;
  displayName: string;
  language: 'en' | 'es' | 'uk';
  familyId: string;
}

export interface Task {
  id?: string;
  familyId: string;
  title: string;
  assignedTo: string | null;
  dueDate: Date | null;
  points: number;
  completed: boolean;
  createdAt: Date;
}

export type RecurrenceFreq = 'none' | 'daily' | 'weekly' | 'monthly';

export interface EventRecurrence {
  freq: RecurrenceFreq;
  /** Last date recurrence may occur on (inclusive). Null = repeats indefinitely. */
  until: Date | null;
}

/** A regular calendar event — job shift, appointment, etc. Distinct from Task: has a time range, not just a due date. */
export interface CalendarEvent {
  id?: string;
  familyId: string;
  title: string;
  start: Date;
  end: Date;
  /** Zero, one, or many family members covering this event. */
  assignedTo: string[];
  location?: string;
  recurrence: EventRecurrence;
  createdAt: Date;
}

/** A concrete, dated instance of a (possibly recurring) CalendarEvent, expanded for display. */
export interface EventOccurrence {
  event: CalendarEvent;
  start: Date;
  end: Date;
}