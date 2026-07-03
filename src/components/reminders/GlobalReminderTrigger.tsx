import React, { useEffect, useState, useRef, useCallback } from "react";
import { useReminderStore, type AssistantReminder } from "@/store/reminder-store";
import CinematicReminderOverlay from "./CinematicReminderOverlay";
import { useAppStore } from "@/store/app-store";
import { markReminderCompletedWithSync, updateReminderWithSync } from "@/lib/memory";

// Minimum age (ms) a reminder must exist before it can fire.
// Prevents AI-parsed reminders with incorrect past timestamps from firing instantly.
const MIN_REMINDER_AGE_MS = 30_000; // 30 seconds

// Cooldown period after dismiss/snooze before we check for new reminders again.
const POST_ACTION_COOLDOWN_MS = 3_000; // 3 seconds

export default function GlobalReminderTrigger() {
  const getPendingReminders = useReminderStore((s) => s.getPendingReminders);
  const user = useAppStore((state) => state.user);
  const [activeReminder, setActiveReminder] = useState<AssistantReminder | null>(null);

  // Track IDs we have already dismissed/snoozed to prevent re-triggering
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  // Cooldown timestamp — don't trigger anything before this time
  const cooldownUntilRef = useRef<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      // If we are already showing a reminder, wait
      if (activeReminder) return;

      // Respect post-action cooldown
      const now = Date.now();
      if (now < cooldownUntilRef.current) return;

      const pending = getPendingReminders();
      const due = pending.find((r) => {
        // Skip if already dismissed/snoozed in this session
        if (dismissedIdsRef.current.has(r.id)) return false;

        // Check if due
        if (r.dueTime > now) return false;

        // Guard against AI-parsed reminders with bad timestamps:
        // If the reminder was created very recently AND its dueTime is already in the past,
        // it's likely an AI parsing error — skip it.
        const age = now - r.createdAt;
        if (age < MIN_REMINDER_AGE_MS && r.dueTime < r.createdAt) return false;

        return true;
      });

      if (due) {
        setActiveReminder(due);
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [activeReminder, getPendingReminders]);

  const handleDismiss = useCallback(() => {
    if (activeReminder) {
      // Mark as dismissed so it can never re-trigger
      dismissedIdsRef.current.add(activeReminder.id);
      // Set cooldown to prevent immediate re-check
      cooldownUntilRef.current = Date.now() + POST_ACTION_COOLDOWN_MS;
      // Mark completed in store + firebase
      markReminderCompletedWithSync(user, activeReminder.id);
      // Clear active reminder
      setActiveReminder(null);
    }
  }, [activeReminder, user]);

  const handleSnooze = useCallback(() => {
    if (activeReminder) {
      // Mark as dismissed for current cycle
      dismissedIdsRef.current.add(activeReminder.id);
      // Set cooldown
      cooldownUntilRef.current = Date.now() + POST_ACTION_COOLDOWN_MS;
      // Snooze for 10 minutes (600,000 ms)
      const newDueTime = Date.now() + 600_000;
      updateReminderWithSync(user, activeReminder.id, { dueTime: newDueTime });
      // Clear active reminder
      setActiveReminder(null);

      // Remove from dismissed set after snooze duration so it can fire again
      const snoozedId = activeReminder.id;
      setTimeout(() => {
        dismissedIdsRef.current.delete(snoozedId);
      }, 600_000);
    }
  }, [activeReminder, user]);

  if (!activeReminder) return null;

  return (
    <CinematicReminderOverlay
      reminder={activeReminder}
      onDismiss={handleDismiss}
      onSnooze={handleSnooze}
    />
  );
}
