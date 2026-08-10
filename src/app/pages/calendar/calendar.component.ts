import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { Task, FamilyMember } from '../../models';

type ViewMode = 'month' | 'week' | 'agenda';

interface DayCell {
  date: Date;
  inMonth: boolean;   // for month view greying of adjacent days
  isToday: boolean;
  tasks: Task[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  private auth = inject(AuthService);
  private taskSvc = inject(TaskService);
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
      });
    }
    return cells;
  });

  // ---- agenda (upcoming dated tasks grouped by day) ----
  agenda = computed<{ date: Date; tasks: Task[] }[]>(() => {
    const today = this.startOfDay(new Date());
    const groups = new Map<number, { date: Date; tasks: Task[] }>();

    for (const t of this.tasks()) {
      const d = this.toDate(t.dueDate);
      if (!d) continue;
      const day = this.startOfDay(d);
      if (day < today) continue;                        // upcoming only
      const key = day.getTime();
      if (!groups.has(key)) groups.set(key, { date: day, tasks: [] });
      groups.get(key)!.tasks.push(t);
    }

    return [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  // tasks for the selected day (details panel)
  selectedTasks = computed<Task[]>(() => this.tasksOn(this.selected()));

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
}