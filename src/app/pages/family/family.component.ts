import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { Task, FamilyMember } from '../../models';
import { defaultColorFor } from '../../color-utils';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './family.component.html',
  styleUrl: './family.component.scss',
})
export class FamilyComponent {
  private auth = inject(AuthService);
  private taskSvc = inject(TaskService);

  profile = toSignal(this.auth.profile$, { initialValue: null });

  members = toSignal(
    this.auth.profile$.pipe(
      switchMap(p => (p ? this.taskSvc.members$(p.familyId) : of([] as FamilyMember[])))
    ),
    { initialValue: [] as FamilyMember[] }
  );

  tasks = toSignal(
    this.auth.profile$.pipe(
      switchMap(p => (p ? this.taskSvc.tasks$(p.familyId) : of([] as Task[])))
    ),
    { initialValue: [] as Task[] }
  );

  // sum of points per member (open tasks only)
  pointsByMember = computed(() => this.taskSvc.loadByMember(this.tasks(), this.members()));

  pointsFor(uid: string): number {
    return this.pointsByMember().get(uid) ?? 0;
  }

  // members ranked by points, highest first
  ranked = computed<FamilyMember[]>(() =>
    [...this.members()].sort((a, b) => this.pointsFor(b.uid) - this.pointsFor(a.uid))
  );

  colorOf(m: FamilyMember): string {
    return m.color || defaultColorFor(m.uid);
  }
}
