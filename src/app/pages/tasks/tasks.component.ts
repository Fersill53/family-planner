import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { Task, FamilyMember } from '../../models';
import { parseLocalDate } from '../../date-utils';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent {
  private auth = inject(AuthService);
  private taskSvc = inject(TaskService);
  private router = inject(Router);

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

  // new-task form fields
  newTitle = '';
  newAssignee = '';
  newPoints = 1;
  newDueDate = '';

  // filter: which member's tasks to show (null = everyone)
  filterUid = signal<string | null>(null);

  // sum of points per member (open tasks only) — for the chips
  pointsByMember = computed(() => this.taskSvc.loadByMember(this.tasks(), this.members()));

  pointsFor(uid: string): number {
    return this.pointsByMember().get(uid) ?? 0;
  }

  // the visible task list, honoring the person filter
  visibleTasks = computed(() => {
    const f = this.filterUid();
    const all = this.tasks();
    if (!f) return all;
    return all.filter(t => t.assignedTo === f);
  });

  memberName(uid: string | null): string {
    if (!uid) return '';
    return this.members().find(m => m.uid === uid)?.displayName ?? '';
  }

  toggleFilter(uid: string) {
    this.filterUid.set(this.filterUid() === uid ? null : uid);
  }

  clearFilter() { this.filterUid.set(null); }

  async addTask() {
    const p = this.profile();
    if (!p || !this.newTitle.trim()) return;

    const task: Omit<Task, 'id'> = {
      familyId: p.familyId,
      title: this.newTitle.trim(),
      assignedTo: this.newAssignee || null,
      dueDate: this.newDueDate ? parseLocalDate(this.newDueDate) : null,
      points: Number(this.newPoints) || 1,
      completed: false,
      createdAt: new Date(),
    };
    await this.taskSvc.add(task);

    this.newTitle = '';
    this.newAssignee = '';
    this.newPoints = 1;
    this.newDueDate = '';
  }

  toggleComplete(t: Task) {
    if (t.id) this.taskSvc.update(t.id, { completed: !t.completed });
  }

  reassign(t: Task, uid: string) {
    if (t.id) this.taskSvc.update(t.id, { assignedTo: uid || null });
  }

  removeTask(t: Task) {
    if (t.id) this.taskSvc.remove(t.id);
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
