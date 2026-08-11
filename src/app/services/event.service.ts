import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc,
  updateDoc, deleteDoc, doc, query, where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CalendarEvent, EventOccurrence, EventOverride, RecurrenceFreq } from '../models';

const MAX_OCCURRENCES_PER_EVENT = 2000;

@Injectable({ providedIn: 'root' })
export class EventService {
  private db = inject(Firestore);

  events$(familyId: string): Observable<CalendarEvent[]> {
    const q = query(collection(this.db, 'events'), where('familyId', '==', familyId));
    return collectionData(q, { idField: 'id' }) as Observable<CalendarEvent[]>;
  }

  overrides$(familyId: string): Observable<EventOverride[]> {
    const q = query(collection(this.db, 'eventOverrides'), where('familyId', '==', familyId));
    return collectionData(q, { idField: 'id' }) as Observable<EventOverride[]>;
  }

  add(event: Omit<CalendarEvent, 'id'>) {
    return addDoc(collection(this.db, 'events'), event);
  }

  update(id: string, changes: Partial<CalendarEvent>) {
    return updateDoc(doc(this.db, 'events', id), changes);
  }

  /** Delete an entire series (and any per-occurrence overrides that belong to it). */
  async removeSeries(eventId: string, overrides: EventOverride[]) {
    const toDelete = overrides.filter(o => o.eventId === eventId);
    await Promise.all(toDelete.map(o => this.removeOverride(o.id!)));
    await deleteDoc(doc(this.db, 'events', eventId));
  }

  /** Delete a non-recurring event (it has no overrides to clean up). */
  remove(id: string) {
    return deleteDoc(doc(this.db, 'events', id));
  }

  addOverride(override: Omit<EventOverride, 'id'>) {
    return addDoc(collection(this.db, 'eventOverrides'), override);
  }

  updateOverride(id: string, changes: Partial<EventOverride>) {
    return updateDoc(doc(this.db, 'eventOverrides', id), changes);
  }

  removeOverride(id: string) {
    return deleteDoc(doc(this.db, 'eventOverrides', id));
  }

  /** Remove a single occurrence from a recurring series without touching the rest. */
  excludeOccurrence(event: CalendarEvent, originalStart: Date) {
    const existing = (event.excludedDates ?? []).map(d => this.toDate(d));
    return updateDoc(doc(this.db, 'events', event.id!), {
      excludedDates: [...existing, originalStart],
    });
  }

  /** Firestore may hand back a Timestamp; normalise to a JS Date. */
  private toDate(v: any): Date {
    if (v instanceof Date) return v;
    if (v && typeof v.toDate === 'function') return v.toDate();
    return new Date(v);
  }

  private step(d: Date, freq: Exclude<RecurrenceFreq, 'none'>): Date {
    const x = new Date(d);
    if (freq === 'daily') x.setDate(x.getDate() + 1);
    else if (freq === 'weekly') x.setDate(x.getDate() + 7);
    else x.setMonth(x.getMonth() + 1);
    return x;
  }

  /** Expand events (including recurring ones) into concrete occurrences overlapping [rangeStart, rangeEnd],
   *  applying any per-occurrence overrides/exclusions. */
  occurrencesInRange(
    events: CalendarEvent[],
    overrides: EventOverride[],
    rangeStart: Date,
    rangeEnd: Date
  ): EventOccurrence[] {
    const out: EventOccurrence[] = [];

    const overridesByEvent = new Map<string, Map<number, EventOverride>>();
    for (const ov of overrides) {
      const key = this.toDate(ov.originalStart).getTime();
      if (!overridesByEvent.has(ov.eventId)) overridesByEvent.set(ov.eventId, new Map());
      overridesByEvent.get(ov.eventId)!.set(key, ov);
    }

    for (const ev of events) {
      if (!ev.id) continue;
      const baseStart = this.toDate(ev.start);
      const baseEnd = this.toDate(ev.end);
      const duration = baseEnd.getTime() - baseStart.getTime();
      const freq = ev.recurrence?.freq ?? 'none';
      const excluded = new Set((ev.excludedDates ?? []).map(d => this.toDate(d).getTime()));
      const evOverrides = overridesByEvent.get(ev.id);

      const emit = (originalStart: Date) => {
        const key = originalStart.getTime();
        if (excluded.has(key)) return;
        const ov = evOverrides?.get(key);
        const start = ov ? this.toDate(ov.start) : originalStart;
        const end = ov ? this.toDate(ov.end) : new Date(originalStart.getTime() + duration);
        if (start > rangeEnd || end < rangeStart) return;
        out.push({
          eventId: ev.id!,
          title: ov ? ov.title : ev.title,
          start,
          end,
          assignedTo: ov ? ov.assignedTo : ev.assignedTo,
          location: ov ? ov.location : ev.location,
          recurrence: ev.recurrence,
          originalStart,
          overrideId: ov?.id,
        });
      };

      if (freq === 'none') {
        emit(baseStart);
        continue;
      }

      const until = ev.recurrence?.until ? this.toDate(ev.recurrence.until) : null;
      let cursor = baseStart;
      let count = 0;
      while (cursor <= rangeEnd && count < MAX_OCCURRENCES_PER_EVENT) {
        if (until && cursor > until) break;
        emit(new Date(cursor));
        cursor = this.step(cursor, freq);
        count++;
      }
    }

    return out.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
}
