import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { EventService } from '../../services/event.service';
import { Task, FamilyMember, CalendarEvent, EventOccurrence, EventOverride, RecurrenceFreq } from '../../models';
import { parseLocalDate } from '../../date-utils';

type ViewMode = 'month' | 'week' | 'agenda';

interface DayCell {
  date: Date;
  inMonth: boolean;   // for month view greying of adjacent days
  isToday: boolean;
  tasks: Task[];
  events: EventOccurrence[];
}

const AGENDA_WINDOW_DAYS = 60;

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  private auth = inject(AuthService);
  private taskSvc = inject(TaskService);
  private eventSvc = inject(EventService);
  private router = inject(Router);

  view = signal<ViewMode>('month');
  cursor = signal<Date>(this.startOfDay(new Date()));   // anchor date for the view
  selected = signal<Date>(this.startOfDay(new Date())); // clicked day

  profile = toSignal(this.auth.profile$, { initialValue: null });

  tasks = toSignal(
    this.auth.profile$.pipe(
      switchMap(p => (p ? this.taskSvc.tasks$(p.familyId) : of([] as Task[])))
    ),
    { initialValue: [] as Task[] }
  );

  events = toSignal(
    this.auth.profile$.pipe(
      switchMap(p => (p ? this.eventSvc.events$(p.familyId) : of([] as CalendarEvent[])))
    ),
    { initialValue: [] as CalendarEvent[] }
  );

  overrides = toSignal(
    this.auth.profile$.pipe(
      switchMap(p => (p ? this.eventSvc.overrides$(p.familyId) : of([] as EventOverride[])))
    ),
    { initialValue: [] as EventOverride[] }
  );

  members = toSignal(
    this.auth.profile$.pipe(
      switchMap(p => (p ? this.taskSvc.members$(p.familyId) : of([] as FamilyMember[])))
    ),
    { initialValue: [] as FamilyMember[] }
  );

  // ---- date helpers ----
  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  /** Firestore may hand back a Timestamp; normalise to a JS Date. */
  private toDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate(); // Firestore Timestamp
    return new Date(v);
  }

  private sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  private tasksOn(date: Date): Task[] {
    return this.tasks().filter(t => {
      const d = this.toDate(t.dueDate);
      return d ? this.sameDay(d, date) : false;
    });
  }

  private eventsOn(date: Date): EventOccurrence[] {
    const rangeStart = this.startOfDay(date);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    return this.eventSvc
      .occurrencesInRange(this.events(), this.overrides(), rangeStart, rangeEnd)
      .filter(o => this.sameDay(o.start, date));
  }

  // ---- month grid (6 weeks = 42 cells) ----
  monthGrid = computed<DayCell[]>(() => {
    const cur = this.cursor();
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();               // 0 = Sunday
    const gridStart = new Date(year, month, 1 - startOffset);
    const today = this.startOfDay(new Date());

    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      cells.push({
        date,
        inMonth: date.getMonth() === month,
        isToday: this.sameDay(date, today),
        tasks: this.tasksOn(date),
        events: this.eventsOn(date),
      });
    }
    return cells;
  });

  // ---- week strip (7 cells) ----
  weekGrid = computed<DayCell[]>(() => {
    const cur = this.cursor();
    const start = new Date(cur);
    start.setDate(cur.getDate() - cur.getDay());       // back to Sunday
    const today = this.startOfDay(new Date());

    const cells: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      cells.push({
        date,
        inMonth: true,
        isToday: this.sameDay(date, today),
        tasks: this.tasksOn(date),
        events: this.eventsOn(date),
      });
    }
    return cells;
  });

  // ---- agenda (upcoming dated tasks + events grouped by day) ----
  agenda = computed<{ date: Date; tasks: Task[]; events: EventOccurrence[] }[]>(() => {
    const today = this.startOfDay(new Date());
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + AGENDA_WINDOW_DAYS);

    const groups = new Map<number, { date: Date; tasks: Task[]; events: EventOccurrence[] }>();

    const dayGroup = (day: Date) => {
      const key = day.getTime();
      if (!groups.has(key)) groups.set(key, { date: day, tasks: [], events: [] });
      return groups.get(key)!;
    };

    for (const t of this.tasks()) {
      const d = this.toDate(t.dueDate);
      if (!d) continue;
      const day = this.startOfDay(d);
      if (day < today) continue; // upcoming only
      dayGroup(day).tasks.push(t);
    }

    for (const occ of this.eventSvc.occurrencesInRange(this.events(), this.overrides(), today, windowEnd)) {
      const day = this.startOfDay(occ.start);
      if (day < today) continue;
      dayGroup(day).events.push(occ);
    }

    return [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  // tasks/events for the selected day (details panel)
  selectedTasks = computed<Task[]>(() => this.tasksOn(this.selected()));
  selectedEvents = computed<EventOccurrence[]>(() => this.eventsOn(this.selected()));

  // ---- labels ----
  monthLabel = computed(() => {
    const d = this.cursor();
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  });

  weekLabel = computed(() => {
    const cells = this.weekGrid();
    if (!cells.length) return '';
    const a = cells[0].date, b = cells[6].date;
    const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${a.toLocaleDateString(undefined, opt)} – ${b.toLocaleDateString(undefined, opt)}`;
  });

  weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  memberName(uid: string | null): string {
    if (!uid) return '';
    return this.members().find(m => m.uid === uid)?.displayName ?? '';
  }

  assigneeNames(uids: string[]): string {
    return uids.map(u => this.memberName(u)).filter(Boolean).join(', ');
  }

  // ---- interactions ----
  setView(v: ViewMode) { this.view.set(v); }

  selectDay(date: Date) { this.selected.set(this.startOfDay(date)); }

  prev() { this.step(-1); }
  next() { this.step(1); }

  private step(dir: number) {
    const c = new Date(this.cursor());
    if (this.view() === 'month') c.setMonth(c.getMonth() + dir);
    else if (this.view() === 'week') c.setDate(c.getDate() + dir * 7);
    this.cursor.set(this.startOfDay(c));
  }

  today() {
    const t = this.startOfDay(new Date());
    this.cursor.set(t);
    this.selected.set(t);
  }

  isSelected(date: Date): boolean {
    return this.sameDay(date, this.selected());
  }

  goToTasks() { this.router.navigate(['/tasks']); }

  // ---- add-event form ----
  showEventForm = signal(false);
  newEventTitle = '';
  newEventDate = '';
  newEventStart = '';
  newEventEnd = '';
  newEventFreq: RecurrenceFreq = 'none';
  newEventUntil = '';
  newEventAssignees = signal<string[]>([]);

  toggleEventForm() { this.showEventForm.set(!this.showEventForm()); }

  isNewAssignee(uid: string): boolean {
    return this.newEventAssignees().includes(uid);
  }

  toggleNewAssignee(uid: string) {
    const cur = this.newEventAssignees();
    this.newEventAssignees.set(
      cur.includes(uid) ? cur.filter(x => x !== uid) : [...cur, uid]
    );
  }

  async addEvent() {
    const p = this.profile();
    if (!p || !this.newEventTitle.trim() || !this.newEventDate || !this.newEventStart || !this.newEventEnd) return;

    const start = new Date(`${this.newEventDate}T${this.newEventStart}`);
    const end = new Date(`${this.newEventDate}T${this.newEventEnd}`);
    if (end <= start) return;

    const event: Omit<CalendarEvent, 'id'> = {
      familyId: p.familyId,
      title: this.newEventTitle.trim(),
      start,
      end,
      assignedTo: this.newEventAssignees(),
      recurrence: {
        freq: this.newEventFreq,
        until: this.newEventUntil ? parseLocalDate(this.newEventUntil) : null,
      },
      createdAt: new Date(),
    };
    await this.eventSvc.add(event);

    this.newEventTitle = '';
    this.newEventDate = '';
    this.newEventStart = '';
    this.newEventEnd = '';
    this.newEventFreq = 'none';
    this.newEventUntil = '';
    this.newEventAssignees.set([]);
  }

  // ---- per-occurrence identity ----
  occKey(occ: EventOccurrence): string {
    return `${occ.eventId}-${occ.originalStart.getTime()}`;
  }

  isRecurring(occ: EventOccurrence): boolean {
    return occ.recurrence.freq !== 'none';
  }

  private eventById(id: string): CalendarEvent | undefined {
    return this.events().find(e => e.id === id);
  }

  // ---- delete: single occurrence vs whole series ----
  confirmDeleteKey = signal<string | null>(null);

  requestDelete(occ: EventOccurrence) {
    if (!this.isRecurring(occ)) {
      this.eventSvc.remove(occ.eventId);
      return;
    }
    this.confirmDeleteKey.set(this.occKey(occ));
  }

  cancelDelete() { this.confirmDeleteKey.set(null); }

  isConfirmingDelete(occ: EventOccurrence): boolean {
    return this.confirmDeleteKey() === this.occKey(occ);
  }

  async deleteThisOccurrence(occ: EventOccurrence) {
    if (occ.overrideId) await this.eventSvc.removeOverride(occ.overrideId);
    const ev = this.eventById(occ.eventId);
    if (ev) await this.eventSvc.excludeOccurrence(ev, occ.originalStart);
    this.confirmDeleteKey.set(null);
  }

  async deleteWholeSeries(occ: EventOccurrence) {
    await this.eventSvc.removeSeries(occ.eventId, this.overrides());
    this.confirmDeleteKey.set(null);
  }

  // ---- edit: single occurrence vs whole series ----
  editingKey = signal<string | null>(null);
  editTitle = '';
  editDate = '';
  editStart = '';
  editEnd = '';
  editAssignees = signal<string[]>([]);

  isEditing(occ: EventOccurrence): boolean {
    return this.editingKey() === this.occKey(occ);
  }

  startEdit(occ: EventOccurrence) {
    this.editingKey.set(this.occKey(occ));
    this.editTitle = occ.title;
    this.editDate = this.toInputDate(occ.start);
    this.editStart = this.toInputTime(occ.start);
    this.editEnd = this.toInputTime(occ.end);
    this.editAssignees.set([...occ.assignedTo]);
    this.confirmDeleteKey.set(null);
  }

  cancelEdit() { this.editingKey.set(null); }

  isEditAssignee(uid: string): boolean {
    return this.editAssignees().includes(uid);
  }

  toggleEditAssignee(uid: string) {
    const cur = this.editAssignees();
    this.editAssignees.set(cur.includes(uid) ? cur.filter(x => x !== uid) : [...cur, uid]);
  }

  private buildEditTimes(): { start: Date; end: Date } | null {
    if (!this.editTitle.trim() || !this.editDate || !this.editStart || !this.editEnd) return null;
    const start = new Date(`${this.editDate}T${this.editStart}`);
    const end = new Date(`${this.editDate}T${this.editEnd}`);
    if (end <= start) return null;
    return { start, end };
  }

  /** Save edits to the whole series (or the only occurrence, for non-recurring events). */
  async saveEditWhole(occ: EventOccurrence) {
    const times = this.buildEditTimes();
    if (!times) return;
    await this.eventSvc.update(occ.eventId, {
      title: this.editTitle.trim(),
      start: times.start,
      end: times.end,
      assignedTo: this.editAssignees(),
    });
    this.editingKey.set(null);
  }

  /** Save edits to just this occurrence of a recurring series, via an override. */
  async saveEditThis(occ: EventOccurrence) {
    const times = this.buildEditTimes();
    const p = this.profile();
    if (!times || !p) return;

    if (occ.overrideId) {
      await this.eventSvc.updateOverride(occ.overrideId, {
        title: this.editTitle.trim(),
        start: times.start,
        end: times.end,
        assignedTo: this.editAssignees(),
      });
    } else {
      await this.eventSvc.addOverride({
        familyId: p.familyId,
        eventId: occ.eventId,
        originalStart: occ.originalStart,
        title: this.editTitle.trim(),
        start: times.start,
        end: times.end,
        assignedTo: this.editAssignees(),
        createdAt: new Date(),
      });
    }
    this.editingKey.set(null);
  }

  private toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toInputTime(d: Date): string {
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
}
