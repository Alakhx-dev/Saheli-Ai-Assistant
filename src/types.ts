export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  user_id?: string;
}

export interface Goal {
  id: string;
  text: string;
  user_id?: string;
}

export interface UserMemory {
  name: string;
  goals: string[];
  preferences: string[];
}

export type Page = 'dashboard' | 'tasks' | 'camera' | 'chat' | 'profile' | 'roadmap';
