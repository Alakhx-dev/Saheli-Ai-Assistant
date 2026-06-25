import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AssistantReminder {
  id: string;
  title: string;
  message?: string;
  dueTime: number; // timestamp in milliseconds
  isCompleted: boolean;
  createdAt: number;
}

interface ReminderState {
  reminders: AssistantReminder[];
  addReminder: (reminder: AssistantReminder) => void;
  updateReminder: (id: string, updates: Partial<AssistantReminder>) => void;
  deleteReminder: (id: string) => void;
  markCompleted: (id: string) => void;
  getPendingReminders: () => AssistantReminder[];
  setReminders: (reminders: AssistantReminder[]) => void;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],
      addReminder: (newReminder) => {
        set((state) => ({ reminders: [...state.reminders, newReminder] }));
      },
      updateReminder: (id, updates) => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },
      deleteReminder: (id) => {
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id),
        }));
      },
      markCompleted: (id) => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, isCompleted: true } : r
          ),
        }));
      },
      getPendingReminders: () => {
        return get().reminders.filter((r) => !r.isCompleted);
      },
      setReminders: (reminders) => {
        set({ reminders });
      },
    }),
    {
      name: "saheli-reminders-storage",
    }
  )
);
