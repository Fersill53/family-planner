import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc,
  updateDoc, deleteDoc, doc, query, where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CalendarEvent, EventOccurrence, RecurrenceFreq } from '../models';

const MAX_OCCURRENCES_PER_EVENT = 2000;

@Injectable({ providedIn: 'root' })
export class EventService {
  private db = inject(Firestore);

  events$(familyId: string): Observable<CalendarEvent[]> {
    const q = query(collection(this.db, 'events'), where('familyId', '==', familyId));
    return collectionData(q, { idField: 'id' }) as Observable<CalendarEvent[]>;
  }

  add(event: Omit<CalendarEvent, 'id'>) {
    return addDoc(collection(this.db, 'events'), event);
  }

  update(id: string, changes: Partial<CalendarEvent>) {
    return updateDoc(doc(this.db, 'events', id), changes);
  }

  remove(id: string) {
    return deleteDoc(doc(this.db, 'events', id));
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

  /** Expand events (including recurring ones) into concrete occurrences overlapping [rangeStart, rangeEnd]. */
  occurrencesInRange(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): EventOccurrence[] {
    const out: EventOccurrence[] = [];

    for (const ev of events) {
      const baseStart = this.toDate(ev.start);
      const baseEnd = this.toDate(ev.end);
      const duration = baseEnd.getTime() - baseStart.getTime();
      const freq = ev.recurrence?.freq ?? 'none';

      if (freq === 'none') {
        if (baseStart <= rangeEnd && baseEnd >= rangeStart) {
          out.push({ event: ev, start: baseStart, end: baseEnd });
        }
        continue;
      }

      const until = ev.recurrence?.until ? this.toDate(ev.recurrence.until) : null;
      let cursor = baseStart;
      let count = 0;
      while (cursor <= rangeEnd && count < MAX_OCCURRENCES_PER_EVENT) {
        if (until && cursor > until) break;
        const occEnd = new Date(cursor.getTime() + duration);
        if (occEnd >= rangeStart) {
          out.push({ event: ev, start: cursor, end: occEnd });
        }
        cursor = this.step(cursor, freq);
        count++;
      }
    }

    return out.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
}
