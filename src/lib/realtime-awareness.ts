export type DayState = "day" | "night";
export type TimeFormatMode = "12h" | "24h";
export type LocationPermissionState = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

export interface DateTimeSnapshot {
  isoNow: string;
  currentTime: string;
  currentDate: string;
  weekday: string;
  hour24: number;
  meridiem: "AM" | "PM";
  dayState: DayState;
}

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  updatedAt: number;
}

export interface WeatherSnapshot {
  temperatureC: number;
  feelsLikeC?: number;
  hotColdState: "hot" | "cold" | "mild";
  weatherCode: number;
  condition: string;
  isRainy: boolean;
  isCloudy: boolean;
  dayState: DayState;
  updatedAt: number;
}

export interface ConversationTiming {
  sessionStartedAt: string;
  lastActiveAt: string;
  previousSessionAt?: string;
  previousChatDate?: string;
}

export interface RealtimeAwarenessSnapshot {
  datetime: DateTimeSnapshot;
  location?: LocationSnapshot;
  weather?: WeatherSnapshot;
  timing: ConversationTiming;
  permission: LocationPermissionState;
}

export interface RealtimeAwarenessSettings {
  timeFormat: TimeFormatMode;
  showDayDate: boolean;
}

export const AWARENESS_STORAGE_KEYS = {
  cache: "saheli_realtime_awareness_cache_v1",
  settings: "saheli_realtime_awareness_settings_v1",
  permissionPrompted: "saheli_location_prompted_once_v1",
};

const DEFAULT_SETTINGS: RealtimeAwarenessSettings = {
  timeFormat: "12h",
  showDayDate: true,
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function resolveDayState(hour24: number): DayState {
  return hour24 >= 6 && hour24 < 18 ? "day" : "night";
}

function buildTimeString(date: Date, mode: TimeFormatMode): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: mode === "12h",
  });
}

export function buildDateTimeSnapshot(now: Date = new Date(), mode: TimeFormatMode = "12h"): DateTimeSnapshot {
  const hour24 = now.getHours();
  return {
    isoNow: now.toISOString(),
    currentTime: buildTimeString(now, mode),
    currentDate: now.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    weekday: now.toLocaleDateString(undefined, { weekday: "long" }),
    hour24,
    meridiem: hour24 >= 12 ? "PM" : "AM",
    dayState: resolveDayState(hour24),
  };
}

export function readAwarenessSettings(): RealtimeAwarenessSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  const parsed = safeParse<Partial<RealtimeAwarenessSettings>>(
    window.localStorage.getItem(AWARENESS_STORAGE_KEYS.settings),
  );

  return {
    timeFormat: parsed?.timeFormat === "24h" ? "24h" : "12h",
    showDayDate: parsed?.showDayDate !== false,
  };
}

export function writeAwarenessSettings(settings: RealtimeAwarenessSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AWARENESS_STORAGE_KEYS.settings, JSON.stringify(settings));
}

export function readAwarenessCache(): RealtimeAwarenessSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  return safeParse<RealtimeAwarenessSnapshot>(window.localStorage.getItem(AWARENESS_STORAGE_KEYS.cache));
}

export function writeAwarenessCache(cache: RealtimeAwarenessSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AWARENESS_STORAGE_KEYS.cache, JSON.stringify(cache));
}

export function shouldRefreshWeather(lastUpdatedAt?: number, maxAgeMs: number = 20 * 60 * 1000): boolean {
  if (!lastUpdatedAt) return true;
  return Date.now() - lastUpdatedAt >= maxAgeMs;
}

export function shouldRefreshLocation(lastUpdatedAt?: number, maxAgeMs: number = 6 * 60 * 60 * 1000): boolean {
  if (!lastUpdatedAt) return true;
  return Date.now() - lastUpdatedAt >= maxAgeMs;
}

export function weatherConditionFromCode(code: number): { condition: string; isRainy: boolean; isCloudy: boolean } {
  if (code === 0) {
    return { condition: "Clear", isRainy: false, isCloudy: false };
  }

  if ([1, 2].includes(code)) {
    return { condition: "Partly cloudy", isRainy: false, isCloudy: true };
  }

  if (code === 3) {
    return { condition: "Overcast", isRainy: false, isCloudy: true };
  }

  if ([45, 48].includes(code)) {
    return { condition: "Foggy", isRainy: false, isCloudy: true };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return { condition: "Drizzle", isRainy: true, isCloudy: true };
  }

  if ([61, 63, 65, 66, 67].includes(code)) {
    return { condition: "Rainy", isRainy: true, isCloudy: true };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { condition: "Snowy", isRainy: false, isCloudy: true };
  }

  if ([80, 81, 82].includes(code)) {
    return { condition: "Rain showers", isRainy: true, isCloudy: true };
  }

  if ([95, 96, 99].includes(code)) {
    return { condition: "Stormy", isRainy: true, isCloudy: true };
  }

  return { condition: "Cloudy", isRainy: false, isCloudy: true };
}

export function resolveHotColdState(temperatureC: number): "hot" | "cold" | "mild" {
  if (temperatureC >= 31) return "hot";
  if (temperatureC <= 18) return "cold";
  return "mild";
}

export function buildLocationLabel(location?: LocationSnapshot): string {
  if (!location) return "Location unavailable";
  const parts = [location.city, location.region, location.country].filter(Boolean);
  if (parts.length === 0) return "Location detected";
  return parts.join(", ");
}

export function buildWeatherLabel(weather?: WeatherSnapshot): string {
  if (!weather) return "Weather unavailable";
  const base = `${Math.round(weather.temperatureC)}°C, ${weather.condition}`;
  if (typeof weather.feelsLikeC === "number") {
    return `${base} (feels ${Math.round(weather.feelsLikeC)}°C)`;
  }
  return base;
}
