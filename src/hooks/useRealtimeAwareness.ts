import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AWARENESS_STORAGE_KEYS,
  buildDateTimeSnapshot,
  buildLocationLabel,
  buildWeatherLabel,
  readAwarenessCache,
  readAwarenessSettings,
  shouldRefreshLocation,
  shouldRefreshWeather,
  resolveHotColdState,
  weatherConditionFromCode,
  writeAwarenessCache,
  writeAwarenessSettings,
  type ConversationTiming,
  type DateTimeSnapshot,
  type LocationPermissionState,
  type LocationSnapshot,
  type RealtimeAwarenessSettings,
  type RealtimeAwarenessSnapshot,
  type WeatherSnapshot,
} from "@/lib/realtime-awareness";

const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const REVERSE_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/reverse";
const FRIENDLY_LOCATION_PROMPT = "Location allow karoge to hum aur real-time baatein kar payenge 💜";
const FRIENDLY_LOCATION_REQUEST = "Agar tum allow karo, main location se weather aur time vibes aur accurate rakh sakti hoon 💫";

interface ReverseGeocodeResponse {
  results?: Array<{
    name?: string;
    admin1?: string;
    country?: string;
    timezone?: string;
  }>;
}

interface WeatherResponse {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
  };
}

interface UseRealtimeAwarenessResult {
  awareness: RealtimeAwarenessSnapshot;
  settings: RealtimeAwarenessSettings;
  setTimeFormat: (mode: "12h" | "24h") => void;
  toggleDayDateVisibility: () => void;
  refreshLocationAndWeather: () => Promise<void>;
  refreshTimeNow: () => void;
  markActiveNow: () => void;
  isRefreshing: boolean;
  locationLabel: string;
  weatherLabel: string;
}

function createInitialTiming(cache: RealtimeAwarenessSnapshot | null): ConversationTiming {
  const nowIso = new Date().toISOString();
  const previousLastActive = cache?.timing?.lastActiveAt;

  return {
    sessionStartedAt: nowIso,
    lastActiveAt: nowIso,
    previousSessionAt: previousLastActive,
    previousChatDate: previousLastActive ? new Date(previousLastActive).toLocaleDateString() : cache?.timing?.previousChatDate,
  };
}

function createInitialAwareness(settings: RealtimeAwarenessSettings): RealtimeAwarenessSnapshot {
  const cache = readAwarenessCache();
  const datetime = buildDateTimeSnapshot(new Date(), settings.timeFormat);
  const timing = createInitialTiming(cache);

  return {
    datetime,
    location: cache?.location,
    weather: cache?.weather,
    timing,
    permission: cache?.permission ?? "unknown",
  };
}

async function resolvePermissionState(): Promise<LocationPermissionState> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return "unsupported";
  }

  try {
    if (!navigator.permissions?.query) {
      return "unknown";
    }

    const permissionResult = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    if (permissionResult.state === "granted") return "granted";
    if (permissionResult.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "unknown";
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

async function reverseGeocode(latitude: number, longitude: number): Promise<Partial<LocationSnapshot>> {
  const response = await fetch(
    `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`,
  );

  if (!response.ok) {
    throw new Error(`Reverse geocode failed: ${response.status}`);
  }

  const data = (await response.json()) as ReverseGeocodeResponse;
  const first = data.results?.[0];

  return {
    city: first?.name,
    region: first?.admin1,
    country: first?.country,
    timezone: first?.timezone,
  };
}

async function fetchWeather(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const response = await fetch(
    `${WEATHER_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,is_day&timezone=auto`,
  );

  if (!response.ok) {
    throw new Error(`Weather fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as WeatherResponse;
  const current = data.current;

  const temperatureC = typeof current?.temperature_2m === "number" ? current.temperature_2m : 0;
  const feelsLikeC = typeof current?.apparent_temperature === "number" ? current.apparent_temperature : undefined;
  const weatherCode = typeof current?.weather_code === "number" ? current.weather_code : 0;
  const weatherMeta = weatherConditionFromCode(weatherCode);

  return {
    temperatureC,
    feelsLikeC,
    hotColdState: resolveHotColdState(temperatureC),
    weatherCode,
    condition: weatherMeta.condition,
    isRainy: weatherMeta.isRainy,
    isCloudy: weatherMeta.isCloudy,
    dayState: current?.is_day === 1 ? "day" : "night",
    updatedAt: Date.now(),
  };
}

export function useRealtimeAwareness(): UseRealtimeAwarenessResult {
  const [settings, setSettings] = useState<RealtimeAwarenessSettings>(() => readAwarenessSettings());
  const [awareness, setAwareness] = useState<RealtimeAwarenessSnapshot>(() => createInitialAwareness(readAwarenessSettings()));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastTimingWriteRef = useRef(0);
  const deniedToastShownRef = useRef(false);

  const persistAwareness = useCallback((next: RealtimeAwarenessSnapshot) => {
    setAwareness(next);
    writeAwarenessCache(next);
  }, []);

  const refreshTimeNow = useCallback(() => {
    setAwareness((prev) => {
      const next: RealtimeAwarenessSnapshot = {
        ...prev,
        datetime: buildDateTimeSnapshot(new Date(), settings.timeFormat),
      };
      writeAwarenessCache(next);
      return next;
    });
  }, [settings.timeFormat]);

  const markActiveNow = useCallback(() => {
    const now = Date.now();
    if (now - lastTimingWriteRef.current < 30000) {
      return;
    }
    lastTimingWriteRef.current = now;

    setAwareness((prev) => {
      const next: RealtimeAwarenessSnapshot = {
        ...prev,
        timing: {
          ...prev.timing,
          lastActiveAt: new Date().toISOString(),
        },
      };
      writeAwarenessCache(next);
      return next;
    });
  }, []);

  const runLocationWeatherRefresh = useCallback(async (options?: { force?: boolean; requestPermission?: boolean }) => {
    const force = options?.force === true;
    const requestPermission = options?.requestPermission !== false;

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setAwareness((prev) => {
        const next = { ...prev, permission: "unsupported" as LocationPermissionState };
        writeAwarenessCache(next);
        return next;
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const permission = await resolvePermissionState();

      setAwareness((prev) => {
        const next = { ...prev, permission };
        writeAwarenessCache(next);
        return next;
      });

      if (permission === "denied") {
        if (!deniedToastShownRef.current || force) {
          deniedToastShownRef.current = true;
          toast.message(FRIENDLY_LOCATION_PROMPT);
        }
        return;
      }

      const askedBefore = typeof window !== "undefined"
        && window.localStorage.getItem(AWARENESS_STORAGE_KEYS.permissionPrompted) === "true";
      const allowPromptRequest = requestPermission && (!askedBefore || force || permission === "prompt");

      const locationStale = shouldRefreshLocation(awareness.location?.updatedAt);
      const weatherStale = shouldRefreshWeather(awareness.weather?.updatedAt);

      if (permission === "prompt" && !allowPromptRequest) {
        if (!force && awareness.location && weatherStale) {
          const weather = await fetchWeather(awareness.location.latitude, awareness.location.longitude);
          setAwareness((prev) => {
            const next: RealtimeAwarenessSnapshot = {
              ...prev,
              weather,
            };
            writeAwarenessCache(next);
            return next;
          });
        }
        return;
      }

      if (!force && !locationStale && !weatherStale) {
        return;
      }

      if (allowPromptRequest && typeof window !== "undefined") {
        if (permission === "prompt" && !askedBefore) {
          toast.message(FRIENDLY_LOCATION_REQUEST);
        }
        window.localStorage.setItem(AWARENESS_STORAGE_KEYS.permissionPrompted, "true");
      }

      const position = await getCurrentPosition();
      const latitude = Number(position.coords.latitude.toFixed(6));
      const longitude = Number(position.coords.longitude.toFixed(6));

      const [geoMeta, weather] = await Promise.all([
        reverseGeocode(latitude, longitude).catch(() => ({})),
        fetchWeather(latitude, longitude),
      ]);

      const location: LocationSnapshot = {
        latitude,
        longitude,
        city: geoMeta.city,
        region: geoMeta.region,
        country: geoMeta.country,
        timezone: geoMeta.timezone,
        updatedAt: Date.now(),
      };

      setAwareness((prev) => {
        const next: RealtimeAwarenessSnapshot = {
          ...prev,
          permission: "granted",
          location,
          weather,
        };
        writeAwarenessCache(next);
        return next;
      });
    } catch (error) {
      const geoError = error as { code?: number } | undefined;
      if (geoError?.code === 1) {
        setAwareness((prev) => {
          const next = { ...prev, permission: "denied" as LocationPermissionState };
          writeAwarenessCache(next);
          return next;
        });
        if (!deniedToastShownRef.current || force) {
          deniedToastShownRef.current = true;
          toast.message(FRIENDLY_LOCATION_PROMPT);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [awareness.location?.updatedAt, awareness.weather?.updatedAt]);

  useEffect(() => {
    writeAwarenessSettings(settings);
    setAwareness((prev) => {
      const next: RealtimeAwarenessSnapshot = {
        ...prev,
        datetime: buildDateTimeSnapshot(new Date(), settings.timeFormat),
      };
      writeAwarenessCache(next);
      return next;
    });
  }, [settings]);

  useEffect(() => {
    refreshTimeNow();
    void runLocationWeatherRefresh({ requestPermission: true });

    const minuteInterval = window.setInterval(() => {
      refreshTimeNow();
    }, 60000);

    const weatherInterval = window.setInterval(() => {
      void runLocationWeatherRefresh({ requestPermission: false });
    }, 20 * 60 * 1000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshTimeNow();
        void runLocationWeatherRefresh({ requestPermission: false });
      }
    };

    const onInteraction = () => {
      markActiveNow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointerdown", onInteraction);
    window.addEventListener("keydown", onInteraction);

    return () => {
      window.clearInterval(minuteInterval);
      window.clearInterval(weatherInterval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
    };
  }, [markActiveNow, refreshTimeNow, runLocationWeatherRefresh]);

  const setTimeFormat = useCallback((mode: "12h" | "24h") => {
    setSettings((prev) => ({ ...prev, timeFormat: mode }));
  }, []);

  const toggleDayDateVisibility = useCallback(() => {
    setSettings((prev) => ({ ...prev, showDayDate: !prev.showDayDate }));
  }, []);

  const refreshLocationAndWeather = useCallback(async () => {
    await runLocationWeatherRefresh({ force: true, requestPermission: true });
  }, [runLocationWeatherRefresh]);

  const locationLabel = useMemo(() => buildLocationLabel(awareness.location), [awareness.location]);
  const weatherLabel = useMemo(() => buildWeatherLabel(awareness.weather), [awareness.weather]);

  return {
    awareness,
    settings,
    setTimeFormat,
    toggleDayDateVisibility,
    refreshLocationAndWeather,
    refreshTimeNow,
    markActiveNow,
    isRefreshing,
    locationLabel,
    weatherLabel,
  };
}
