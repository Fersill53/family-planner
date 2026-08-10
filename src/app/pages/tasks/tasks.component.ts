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

  // current user's profile (has familyId)
  profile = toSignal(this.auth.profile$, { initialValue: null });

  // tasks + members for this family, re-fetched when profile loads
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

  // load per member, computed reactively
  load = computed(() => this.taskSvc.loadByMember(this.tasks(), this.members()));

  // the member carrying the most, and whether they're overloaded
  mostLoaded = computed<{ member: FamilyMember | null; points: number }>(() => {
    const members = this.members();
    const load = this.load();
    if (!members.length) return { member: null, points: 0 };
    let top = members[0];
    for (const m of members) {
      if ((load.get(m.uid) ?? 0) > (load.get(top.uid) ?? 0)) top = m;
    }
    return { member: top, points: load.get(top.uid) ?? 0 };
  });

  // simple heuristic: overloaded if one person has >50% of all open points
  isImbalanced = computed(() => {
    const load = this.load();
    const total = [...load.values()].reduce((a, b) => a + b, 0);
    if (total === 0) return false;
    return this.mostLoaded().points > total * 0.5;
  });

  memberName(uid: string | null): string {
    if (!uid) return '';
    return this.members().find(m => m.uid === uid)?.displayName ?? '';
  }

  loadFor(uid: string): number {
    return this.load().get(uid) ?? 0;
  }

  async addTask() {
    const p = this.profile();
    if (!p || !this.newTitle.trim()) return;

    const task: Omit<Task, 'id'> = {
      familyId: p.familyId,
      title: this.newTitle.trim(),
      assignedTo: this.newAssignee || null,
      dueDate: this.newDueDate ? new Date(this.newDueDate) : null,
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

  // auto-assign the new task to whoever has the lightest load
  suggestForNew() {
    const s = this.taskSvc.suggestAssignee(this.tasks(), this.members());
    if (s) this.newAssignee = s.uid;
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