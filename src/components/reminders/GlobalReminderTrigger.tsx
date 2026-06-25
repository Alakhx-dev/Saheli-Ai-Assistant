import React, { useEffect, useState } from "react";
import { useReminderStore, type AssistantReminder } from "@/store/reminder-store";
import CinematicReminderOverlay from "./CinematicReminderOverlay";
import { useAppStore } from "@/store/app-store";
import { markReminderCompletedWithSync, updateReminderWithSync } from "@/lib/memory";

export default function GlobalReminderTrigger() {
  const { getPendingReminders } = useReminderStore();
  const user = useAppStore((state) => state.user);
  const [activeReminder, setActiveReminder] = useState<AssistantReminder | null>(null);

  useEffect(() => {
    // Check every 10 seconds if any reminder is due
    const interval = setInterval(() => {
      // If we are already showing a reminder, wait
      if (activeReminder) return;

      const now = Date.now();
      const pending = getPendingReminders();
      const due = pending.find((r) => r.dueTime <= now);

      if (due) {
        setActiveReminder(due);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeReminder, getPendingReminders]);

  const handleDismiss = () => {
    if (activeReminder) {
      markReminderCompletedWithSync(user, activeReminder.id);
      setActiveReminder(null);
    }
  };

  const handleSnooze = () => {
    if (activeReminder) {
      // Snooze for 10 minutes (600,000 ms)
      updateReminderWithSync(user, activeReminder.id, { dueTime: Date.now() + 600000 });
      setActiveReminder(null);
    }
  };

  if (!activeReminder) return null;

  return (
    <CinematicReminderOverlay
      reminder={activeReminder}
      onDismiss={handleDismiss}
      onSnooze={handleSnooze}
    />
  );
}
