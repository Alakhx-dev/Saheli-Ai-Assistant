import { useState, useEffect } from 'react';
import { UserMemory } from '../types';

const STORAGE_KEY = 'aura_user_memory';

const DEFAULT_MEMORY: UserMemory = {
  name: 'Bestie',
  goals: [],
  preferences: []
};

export const useUserMemory = () => {
  const [memory, setMemory] = useState<UserMemory>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_MEMORY, ...parsed };
      } catch (e) {
        console.error('Error parsing user memory:', e);
        return DEFAULT_MEMORY;
      }
    }
    return DEFAULT_MEMORY;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  }, [memory]);

  const updateMemory = (newMemory: Partial<UserMemory>) => {
    setMemory(prev => ({ ...prev, ...newMemory }));
  };

  const setName = (name: string) => {
    setMemory(prev => ({ ...prev, name }));
  };

  const addGoal = (goal: string) => {
    if (!memory.goals.includes(goal)) {
      setMemory(prev => ({ ...prev, goals: [...prev.goals, goal] }));
    }
  };

  const removeGoal = (goal: string) => {
    setMemory(prev => ({ ...prev, goals: prev.goals.filter(g => g !== goal) }));
  };

  const addPreference = (pref: string) => {
    if (!memory.preferences.includes(pref)) {
      setMemory(prev => ({ ...prev, preferences: [...prev.preferences, pref] }));
    }
  };

  const removePreference = (pref: string) => {
    setMemory(prev => ({ ...prev, preferences: prev.preferences.filter(p => p !== pref) }));
  };

  return {
    memory,
    updateMemory,
    setName,
    addGoal,
    removeGoal,
    addPreference,
    removePreference
  };
};
