function resolveDayState(hour24: number, sunriseHour = 6.0, sunsetHour = 18.0): "day" | "night" {
  return hour24 >= sunriseHour && hour24 < sunsetHour ? "day" : "night";
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

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000,
  retries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      // Wait before retrying (exponential backoff: 1.5s, 3s)
      await new Promise((resolve) => globalThis.setTimeout(resolve, 1500 * Math.pow(2, attempt)));
    } finally {
      globalThis.clearTimeout(id);
    }
  }
  throw new Error("Fetch failed after retries");
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

  // Use Nominatim directly since Open-Meteo geocoding search does not support reverse lookups (always 404s)
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`;
    const response = await fetchWithTimeout(osmUrl, {
      headers: {
        "User-Agent": "Saheli-AI-Assistant/1.0 (aniraj@saheli.app)"
      }
    }, 10000);
    
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
    // Nominatim fallback fails. Catch silently.
  }

  // If Nominatim fails, return a default safe structure
  return {
    city: null,
    region: null,
    country: null,
    timezone: null,
  };
}

function resolveWeatherAlert(weatherCode: number, windSpeedKph: number, temperatureC: number, uvIndex: number): string {
  if ([95, 96, 99].includes(weatherCode)) return "Thunderstorm";
  if (temperatureC >= 40 || temperatureC <= 0) return "Extreme Weather";
  if ([65, 82].includes(weatherCode)) return "Heavy Rain";
  if (windSpeedKph >= 40) return "High Wind";
  if (uvIndex >= 6) return "High UV";
  return "No Active Alerts";
}

export async function fetchForecast(latitude: number, longitude: number) {
  // Correct Open-Meteo URL parameters: relative_humidity_2m and wind_speed_10m are valid in current; precipitation_probability is ONLY valid in hourly; added daily sunrise, sunset.
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m,uv_index&hourly=temperature_2m,weather_code,precipitation_probability,relative_humidity_2m,wind_speed_10m&daily=sunrise,sunset&forecast_days=2&timezone=auto`;
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`;

  let weatherData: any = null;
  let aqiData: any = null;

  try {
    const [weatherRes, aqiRes] = await Promise.allSettled([
      fetchWithTimeout(url),
      fetchWithTimeout(aqiUrl)
    ]);

    if (weatherRes.status === "fulfilled" && weatherRes.value.ok) {
      weatherData = await weatherRes.value.json();
    } else {
      const errorMsg = weatherRes.status === "rejected" ? weatherRes.reason : `HTTP ${weatherRes.value?.status}`;
      throw new Error(`Weather forecast failed: ${errorMsg}`);
    }

    if (aqiRes.status === "fulfilled" && aqiRes.value.ok) {
      aqiData = await aqiRes.value.json();
    }
  } catch (err: any) {
    throw new Error(`Weather/AQI query failed: ${err?.message || err}`);
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
  } catch (e) {
    // fallback to a default value
    moonPhase = 0.5;
  }

  let sunriseHour = 6.0;
  let sunsetHour = 18.0;
  if (sunrise) {
    try {
      const srDate = new Date(sunrise);
      sunriseHour = srDate.getHours() + srDate.getMinutes() / 60;
    } catch (e) {
      // ignore
    }
  }
  if (sunset) {
    try {
      const ssDate = new Date(sunset);
      sunsetHour = ssDate.getHours() + ssDate.getMinutes() / 60;
    } catch (e) {
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
        dayState: resolveDayState(date.getHours(), sunriseHour, sunsetHour),
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

  const activeAlert = resolveWeatherAlert(weatherCode, windSpeedKph ?? 0, temperatureC, uvIndex);

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
