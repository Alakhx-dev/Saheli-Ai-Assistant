function resolveDayState(hour24: number): "day" | "night" {
  return hour24 >= 6 && hour24 < 18 ? "day" : "night";
}

function weatherConditionFromCode(code: number): { condition: string; isRainy: boolean; isCloudy: boolean } {
  if (code === 0) return { condition: "Clear", isRainy: false, isCloudy: false };
  if ([1, 2].includes(code)) return { condition: "Partly cloudy", isRainy: false, isCloudy: true };
  if (code === 3) return { condition: "Overcast", isRainy: false, isCloudy: true };
  if ([45, 48].includes(code)) return { condition: "Foggy", isRainy: false, isCloudy: true };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Drizzle", isRainy: true, isCloudy: true };
  if ([61, 63, 65, 66, 67].includes(code)) return { condition: "Rainy", isRainy: true, isCloudy: true };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Snowy", isRainy: false, isCloudy: true };
  if ([80, 81, 82].includes(code)) return { condition: "Rain showers", isRainy: true, isCloudy: true };
  if ([95, 96, 99].includes(code)) return { condition: "Stormy", isRainy: true, isCloudy: true };
  return { condition: "Cloudy", isRainy: false, isCloudy: true };
}

function resolveHotColdState(temperatureC: number): "hot" | "cold" | "mild" {
  if (temperatureC >= 31) return "hot";
  if (temperatureC <= 18) return "cold";
  return "mild";
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    globalThis.clearTimeout(id);
  }
}

export async function fetchGeocoding(latitude: number, longitude: number) {
  // Validate coordinates before any API request
  if (
    latitude === undefined || latitude === null || isNaN(latitude) ||
    longitude === undefined || longitude === null || isNaN(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return { city: null, region: null, country: null, timezone: null };
  }

  const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`;
  
  try {
    const response = await fetchWithTimeout(url);
    if (response.ok) {
      const data: any = await response.json();
      const first = data.results?.[0];
      if (first?.name || first?.country) {
        return {
          city: first?.name || null,
          region: first?.admin1 || null,
          country: first?.country || null,
          timezone: first?.timezone || null,
        };
      }
    }
  } catch (err) {
    // Open-Meteo fails or times out. Catch silently.
  }

  // Graceful fallback to Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`;
    const response = await fetchWithTimeout(osmUrl, {
      headers: {
        "User-Agent": "Saheli-AI-Assistant/1.0 (aniraj@saheli.app)"
      }
    });
    
    if (response.ok) {
      const data: any = await response.json();
      const addr = data.address || {};
      
      return {
        city: addr.city || addr.town || addr.village || addr.suburb || addr.municipality || null,
        region: addr.state || addr.region || null,
        country: addr.country || null,
        timezone: null,
      };
    }
  } catch (osmErr) {
    // Nominatim fallback also fails. Catch silently to prevent console spam.
  }

  // If all layers fail, return a default safe structure without throwing
  return {
    city: null,
    region: null,
    country: null,
    timezone: null,
  };
}

export async function fetchForecast(latitude: number, longitude: number) {
  // Correct Open-Meteo URL parameters: relative_humidity_2m and wind_speed_10m are valid in current; precipitation_probability is ONLY valid in hourly.
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability,relative_humidity_2m,wind_speed_10m&forecast_days=2&timezone=auto`;
  
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`Weather forecast failed: ${response.status}`);
  }
  const data: any = await response.json();
  const current = data.current;
  const hourly = data.hourly;

  const temperatureC = typeof current?.temperature_2m === "number" ? current.temperature_2m : 0;
  const feelsLikeC = typeof current?.apparent_temperature === "number" ? current.apparent_temperature : undefined;
  const weatherCode = typeof current?.weather_code === "number" ? current.weather_code : 0;
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
        dayState: resolveDayState(date.getHours()),
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
  };
}

export async function handleWeatherRequest(latitude: number, longitude: number, action: string = "all") {
  const result: Record<string, any> = {};

  const fetchGeo = action === "all" || action === "geocode";
  const fetchWeath = action === "all" || action === "weather";

  const promises: Promise<any>[] = [];
  
  if (fetchGeo) {
    promises.push(
      fetchGeocoding(latitude, longitude)
        .then((res) => {
          result.location = res;
        })
        .catch((err) => {
          console.error("Geocoding fetch failed:", err);
          result.location = null;
          result.locationError = String(err?.message || err);
        })
    );
  }
  
  if (fetchWeath) {
    promises.push(
      fetchForecast(latitude, longitude)
        .then((res) => {
          result.weather = res;
        })
        .catch((err) => {
          console.error("Forecast fetch failed:", err);
          result.weather = null;
          result.weatherError = String(err?.message || err);
        })
    );
  }

  await Promise.allSettled(promises);
  return result;
}
