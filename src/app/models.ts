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