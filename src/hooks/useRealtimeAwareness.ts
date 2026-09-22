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
  // 1. Try backend API first
  try {
    const response = await fetch(
      `/api/weather?lat=${latitude}&lon=${longitude}&action=geocode`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.location && (data.location.city || data.location.region || data.location.country)) {
        return data.location;
      }
    }
  } catch {
    // Silently fall through to direct client geocoding
  }

  // 2. Direct client fallback: BigDataCloud reverse geocode (100% real data, free, CORS-enabled)
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      return {
        city: bdcData.city || bdcData.locality || bdcData.principalSubdivision || undefined,
        region: bdcData.principalSubdivision || undefined,
        country: bdcData.countryName || undefined,
        timezone: undefined,
      };
    }
  } catch {
    // Ignore fallback failure
  }

  return {};
}

async function fetchWeatherDirect(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m,uv_index&hourly=temperature_2m,weather_code,precipitation_probability,relative_humidity_2m,wind_speed_10m&daily=sunrise,sunset&forecast_days=2&timezone=auto`;
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`;

  const [weatherRes, aqiRes] = await Promise.allSettled([
    fetch(url),
    fetch(aqiUrl),
  ]);

  if (weatherRes.status !== "fulfilled" || !weatherRes.value.ok) {
    throw new Error("Direct real-time weather fetch failed");
  }

  const weatherData = await weatherRes.value.json();
  let aqiData: any = null;
  if (aqiRes.status === "fulfilled" && aqiRes.value.ok) {
    try {
      aqiData = await aqiRes.value.json();
    } catch {
      // ignore
    }
  }

  const current = weatherData.current;
  const hourly = weatherData.hourly;
  const daily = weatherData.daily;

  const temperatureC = typeof current?.temperature_2m === "number" ? current.temperature_2m : 0;
  const feelsLikeC = typeof current?.apparent_temperature === "number" ? current.apparent_temperature : undefined;
  const weatherCode = typeof current?.weather_code === "number" ? current.weather_code : 0;
  const uvIndex = typeof current?.uv_index === "number" ? current.uv_index : 0;
  const weatherMeta = weatherConditionFromCode(weatherCode);

  const forecastTimes = hourly?.time ?? [];
  const forecastTemps = hourly?.temperature_2m ?? [];
  const forecastCodes = hourly?.weather_code ?? [];
  const forecastRain = hourly?.precipitation_probability ?? [];
  const forecastHumidity = hourly?.relative_humidity_2m ?? [];
  const forecastWind = hourly?.wind_speed_10m ?? [];

  const currentTimeIso = current?.time ? String(current.time).slice(0, 13) : null;
  const matchedCurrentIndex = currentTimeIso
    ? forecastTimes.findIndex((timeIso: string) => String(timeIso).slice(0, 13) === currentTimeIso)
    : -1;

  const currentHour = new Date().getHours();
  const startIndex = matchedCurrentIndex >= 0
    ? matchedCurrentIndex
    : forecastTimes.length > 0
      ? Math.min(Math.max(currentHour, 0), Math.max(forecastTimes.length - 1, 0))
      : 0;

  const sunrise = daily?.sunrise?.[0];
  const sunset = daily?.sunset?.[0];
  let moonPhase = 0.0;
  try {
    const now = new Date();
    const newMoonRef = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const diffMs = now.getTime() - newMoonRef.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const cycle = 29.530588853;
    const phase = (diffDays / cycle) % 1;
    moonPhase = phase < 0 ? phase + 1 : phase;
  } catch {
    moonPhase = 0.5;
  }

  let sunriseHour = 6.0;
  let sunsetHour = 18.0;
  if (sunrise) {
    try {
      const srDate = new Date(sunrise);
      sunriseHour = srDate.getHours() + srDate.getMinutes() / 60;
    } catch {
      // ignore
    }
  }
  if (sunset) {
    try {
      const ssDate = new Date(sunset);
      sunsetHour = ssDate.getHours() + ssDate.getMinutes() / 60;
    } catch {
      // ignore
    }
  }

  const hourlyForecast = forecastTimes
    .slice(startIndex, startIndex + 6)
    .map((timeIso: string, index: number) => {
      const absoluteIndex = startIndex + index;
      const temperature = typeof forecastTemps[absoluteIndex] === "number" ? forecastTemps[absoluteIndex] : temperatureC;
      const code = typeof forecastCodes[absoluteIndex] === "number" ? forecastCodes[absoluteIndex] : weatherCode;
      const rainProbability = typeof forecastRain[absoluteIndex] === "number" ? forecastRain[absoluteIndex] : undefined;
      const humidity = typeof forecastHumidity[absoluteIndex] === "number" ? forecastHumidity[absoluteIndex] : undefined;
      const wind = typeof forecastWind[absoluteIndex] === "number" ? forecastWind[absoluteIndex] : undefined;
      const meta = weatherConditionFromCode(code);
      const date = new Date(timeIso);

      return {
        timeIso,
        hourLabel: date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
        temperatureC: temperature,
        weatherCode: code,
        condition: meta.condition,
        precipitationProbabilityPercent: rainProbability,
        isRainy: meta.isRainy,
        isCloudy: meta.isCloudy,
        dayState: (date.getHours() >= sunriseHour && date.getHours() < sunsetHour ? "day" : "night") as "day" | "night",
        humidityPercent: humidity,
        windSpeedKph: wind,
      };
    });

  const currentForecastIndex = matchedCurrentIndex >= 0 ? matchedCurrentIndex : startIndex;
  const humidityPercent = typeof current?.relative_humidity_2m === "number"
    ? current.relative_humidity_2m
    : typeof forecastHumidity[currentForecastIndex] === "number"
      ? forecastHumidity[currentForecastIndex]
      : undefined;

  const windSpeedKph = typeof current?.wind_speed_10m === "number"
    ? current.wind_speed_10m
    : typeof forecastWind[currentForecastIndex] === "number"
      ? forecastWind[currentForecastIndex]
      : undefined;

  const rainProbabilityPercent = typeof forecastRain[currentForecastIndex] === "number"
    ? forecastRain[currentForecastIndex]
    : undefined;

  const usAqi = typeof aqiData?.current?.us_aqi === "number" ? aqiData.current.us_aqi : undefined;
  let aqiStatus: string | undefined = undefined;
  if (usAqi !== undefined) {
    if (usAqi <= 50) aqiStatus = "Good";
    else if (usAqi <= 100) aqiStatus = "Moderate";
    else if (usAqi <= 150) aqiStatus = "Sensitive Groups";
    else if (usAqi <= 200) aqiStatus = "Unhealthy";
    else if (usAqi <= 300) aqiStatus = "Very Unhealthy";
    else aqiStatus = "Hazardous";
  }

  let activeAlert = "No Active Alerts";
  if ([95, 96, 99].includes(weatherCode)) activeAlert = "Thunderstorm";
  else if (temperatureC >= 40 || temperatureC <= 0) activeAlert = "Extreme Weather";
  else if ([65, 82].includes(weatherCode)) activeAlert = "Heavy Rain";
  else if ((windSpeedKph ?? 0) >= 40) activeAlert = "High Wind";
  else if (uvIndex >= 6) activeAlert = "High UV";

  return {
    temperatureC,
    feelsLikeC,
    humidityPercent,
    windSpeedKph,
    rainProbabilityPercent,
    hotColdState: resolveHotColdState(temperatureC),
    weatherCode,
    condition: weatherMeta.condition,
    isRainy: weatherMeta.isRainy,
    isCloudy: weatherMeta.isCloudy,
    dayState: current?.is_day === 1 ? "day" : "night",
    updatedAt: Date.now(),
    hourlyForecast,
    aqi: usAqi,
    aqiStatus,
    activeAlert,
    sunrise,
    sunset,
    moonPhase,
  };
}

async function fetchWeather(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  // 1. Try backend API first
  try {
    const response = await fetch(
      `/api/weather?lat=${latitude}&lon=${longitude}&action=weather`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.weather) {
        return data.weather;
      }
    }
  } catch {
    // Backend API failed, proceed to direct client fetch
  }

  // 2. Direct client fallback to Open-Meteo (100% real live meteorological data)
  return fetchWeatherDirect(latitude, longitude);
}

export function useRealtimeAwareness(): UseRealtimeAwarenessResult {
  const [settings, setSettings] = useState<RealtimeAwarenessSettings>(() => readAwarenessSettings());
  const [awareness, setAwareness] = useState<RealtimeAwarenessSnapshot>(() => createInitialAwareness(readAwarenessSettings()));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastTimingWriteRef = useRef(0);
  const deniedToastShownRef = useRef(false);
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

  const runLocationWeatherRefresh = useCallback(async (options?: { force?: boolean; requestPermission?: boolean }): Promise<boolean> => {
    const force = options?.force === true;
    const requestPermission = options?.requestPermission !== false;

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setAwareness((prev) => {
        const next = { ...prev, permission: "unsupported" as LocationPermissionState };
        writeAwarenessCache(next);
        return next;
      });
      return false;
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
        return false;
      }

      const askedBefore = typeof window !== "undefined"
        && window.localStorage.getItem(AWARENESS_STORAGE_KEYS.permissionPrompted) === "true";
      const allowPromptRequest = requestPermission && (!askedBefore || force || permission === "prompt");

      const locationStale = shouldRefreshLocation(awareness.location?.updatedAt);
      const weatherStale = shouldRefreshWeather(awareness.weather?.updatedAt, 60 * 1000);

      if (permission === "prompt" && !allowPromptRequest) {
        if (!force && awareness.location && weatherStale) {
          try {
            const weather = await fetchWeather(awareness.location.latitude, awareness.location.longitude);
            setAwareness((prev) => {
              const next: RealtimeAwarenessSnapshot = {
                ...prev,
                weather,
              };
              writeAwarenessCache(next);
              return next;
            });
            return true;
          } catch (err) {
            return false;
          }
        }
        return !!(awareness.location && !weatherStale);
      }

      if (!force && !locationStale && !weatherStale) {
        return true;
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
          throw new Error(data.weatherError || "Weather data missing in response");
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
      hasLoggedErrorRef.current = false;

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
      return true;
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
      return false;
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

    const timeInterval = window.setInterval(() => {
      refreshTimeNow();
    }, 1000); // 1 second

    let weatherTimeoutId: number | null = null;

    const scheduleNextWeatherRefresh = (delayMs: number) => {
      if (weatherTimeoutId) {
        window.clearTimeout(weatherTimeoutId);
      }
      weatherTimeoutId = window.setTimeout(async () => {
        const success = await runLocationWeatherRefresh({ requestPermission: false });
        if (success) {
          scheduleNextWeatherRefresh(60 * 1000); // 1 minute on success
        } else {
          scheduleNextWeatherRefresh(10 * 1000); // 10 seconds on failure
        }
      }, delayMs);
    };

    const startInitialRefresh = async () => {
      const success = await runLocationWeatherRefresh({ requestPermission: true });
      if (success) {
        scheduleNextWeatherRefresh(60 * 1000);
      } else {
        scheduleNextWeatherRefresh(10 * 1000);
      }
    };
    void startInitialRefresh();

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
      if (weatherTimeoutId) {
        window.clearTimeout(weatherTimeoutId);
      }
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

  const setWeatherRefreshInterval = useCallback((minutes: number) => {
    setSettings((prev) => ({ ...prev, weatherRefreshInterval: minutes }));
  }, []);

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
