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
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    precipitation_probability?: number;
    time?: string;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
    precipitation_probability?: number[];
    relative_humidity_2m?: number[];
    wind_speed_10m?: number[];
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
    `/api/weather?lat=${latitude}&lon=${longitude}&action=geocode`
  );

  if (!response.ok) {
    throw new Error(`Reverse geocode failed: ${response.status}`);
  }

  const data = await response.json();
  return data.location || {};
}

async function fetchWeather(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const response = await fetch(
    `/api/weather?lat=${latitude}&lon=${longitude}&action=weather`
  );

  if (!response.ok) {
    throw new Error(`Weather fetch failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.weather) {
    throw new Error("Weather data missing in response");
  }

  return data.weather;
}

export function useRealtimeAwareness(): UseRealtimeAwarenessResult {
  const [settings, setSettings] = useState<RealtimeAwarenessSettings>(() => readAwarenessSettings());
  const [awareness, setAwareness] = useState<RealtimeAwarenessSnapshot>(() => createInitialAwareness(readAwarenessSettings()));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastTimingWriteRef = useRef(0);
  const deniedToastShownRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const hasLoggedErrorRef = useRef(false);

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

      let geoMeta: Partial<LocationSnapshot> = {};
      let weather: WeatherSnapshot | undefined = undefined;

      try {
        const response = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}&action=all`);
        if (!response.ok) {
          throw new Error(`Weather and geocode fetch failed: ${response.status}`);
        }
        const data = await response.json();
        geoMeta = data.location || {};
        if (data.weather) {
          weather = data.weather;
        } else {
          throw new Error("Weather data missing in response");
        }
      } catch (err) {
        if (!hasLoggedErrorRef.current) {
          console.error("Backend unified weather call failed, falling back to separate calls:", err);
          hasLoggedErrorRef.current = true; // throttle console spam
        }
        try {
          const [geoRes, weatherRes] = await Promise.all([
            reverseGeocode(latitude, longitude).catch(() => ({})),
            fetchWeather(latitude, longitude),
          ]);
          geoMeta = geoRes;
          weather = weatherRes;
        } catch (fallbackErr) {
          // If fallback fails, we intentionally throw to trigger retry logic
          throw new Error("Fallback weather fetch failed");
        }
      }

      // Success - reset retry logic
      retryCountRef.current = 0;
      hasLoggedErrorRef.current = false;
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

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
          weather: weather || prev.weather, // fallback to cache if somehow undefined
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
      } else {
        // Schedule backoff retry for network/weather errors
        const delays = [5000, 15000, 30000, 120000]; // 5s, 15s, 30s, 2m
        const nextDelay = delays[Math.min(retryCountRef.current, delays.length - 1)];
        
        if (retryTimeoutRef.current) {
          window.clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = window.setTimeout(() => {
          retryCountRef.current += 1;
          void runLocationWeatherRefresh({ force: true, requestPermission: false });
        }, nextDelay);
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

    const timeInterval = window.setInterval(() => {
      refreshTimeNow();
    }, 1000); // 1 second

    const weatherInterval = window.setInterval(() => {
      void runLocationWeatherRefresh({ requestPermission: false });
    }, 10 * 60 * 1000); // 10 minutes

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
      window.clearInterval(timeInterval);
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
