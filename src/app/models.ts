export interface FamilyMember {
  uid: string;
  displayName: string;
  language: 'en' | 'es' | 'uk';
  familyId: string;
  /** Hex color this member picked to identify their tasks/events on the calendar. */
  color?: string;
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
  /** Original (series) occurrence start times that were individually deleted. */
  excludedDates?: Date[];
}

/**
 * A per-occurrence edit for one instance of a recurring CalendarEvent
 * (e.g. "just this Tuesday's shift runs late"). Identified by which
 * series it belongs to and the occurrence's original, un-edited start time.
 */
export interface EventOverride {
  id?: string;
  familyId: string;
  eventId: string;
  originalStart: Date;
  title: string;
  start: Date;
  end: Date;
  assignedTo: string[];
  location?: string;
  createdAt: Date;
}

/** A concrete, dated instance of a (possibly recurring) CalendarEvent, expanded for display. */
export interface EventOccurrence {
  eventId: string;
  title: string;
  start: Date;
  end: Date;
  assignedTo: string[];
  location?: string;
  recurrence: EventRecurrence;
  /** This occurrence's slot in the original, un-edited series — the key for overrides/exclusions. */
  originalStart: Date;
  /** Set if this occurrence's fields come from an EventOverride rather than the base series. */
  overrideId?: string;
}