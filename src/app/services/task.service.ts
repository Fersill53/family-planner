import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc,
  updateDoc, deleteDoc, doc, query, where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Task, FamilyMember } from '../models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private db = inject(Firestore);

  tasks$(familyId: string): Observable<Task[]> {
    const q = query(collection(this.db, 'tasks'), where('familyId', '==', familyId));
    return collectionData(q, { idField: 'id' }) as Observable<Task[]>;
  }

  members$(familyId: string): Observable<FamilyMember[]> {
    const q = query(collection(this.db, 'users'), where('familyId', '==', familyId));
    return collectionData(q) as Observable<FamilyMember[]>;
  }

  add(task: Omit<Task, 'id'>) {
    return addDoc(collection(this.db, 'tasks'), task);
  }

  update(id: string, changes: Partial<Task>) {
    return updateDoc(doc(this.db, 'tasks', id), changes);
  }

  remove(id: string) {
    return deleteDoc(doc(this.db, 'tasks', id));
  }

  /** Points earned per member — only tasks that are checked off count. */
  pointsByMember(tasks: Task[], members: FamilyMember[]): Map<string, number> {
    const points = new Map(members.map(m => [m.uid, 0]));
    for (const t of tasks) {
      if (t.completed && t.assignedTo && points.has(t.assignedTo)) {
        points.set(t.assignedTo, points.get(t.assignedTo)! + t.points);
      }
    }
    return points;
  }
}