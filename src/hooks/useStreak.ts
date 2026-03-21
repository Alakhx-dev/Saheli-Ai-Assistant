import { useState, useEffect } from 'react';

const STREAK_KEY = 'aura_streak_data';

interface StreakData {
  count: number;
  lastDate: string; // YYYY-MM-DD
}

export const useStreak = () => {
  const [streak, setStreak] = useState<StreakData>(() => {
    const stored = localStorage.getItem(STREAK_KEY);
    if (stored) {
      const data: StreakData = JSON.parse(stored);
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const lastDateStr = data.lastDate;
      
      if (!lastDateStr) return { count: 0, lastDate: '' };
      if (todayStr === lastDateStr) return data;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // If last completion was not yesterday (and not today), reset streak
      if (lastDateStr !== yesterdayStr) {
        return { count: 0, lastDate: lastDateStr };
      }
      return data;
    }
    return { count: 0, lastDate: '' };
  });

  useEffect(() => {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  }, [streak]);

  const updateStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    
    if (streak.lastDate === today) return; // Already updated today
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (streak.lastDate === yesterdayStr) {
      setStreak({ count: streak.count + 1, lastDate: today });
    } else {
      setStreak({ count: 1, lastDate: today });
    }
  };

  return { streak, updateStreak };
};
