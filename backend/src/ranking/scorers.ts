import type { DailyForecast } from "../openMeteo/types.js";

/** Score 0–100 for each activity based on daily weather. */
export interface DayScore {
  date: string;
  skiing: number;
  surfing: number;
  outdoorSightseeing: number;
  indoorSightseeing: number;
}

function getOrZero(arr: (number | null)[], i: number): number {
  const v = arr[i];
  return v ?? 0;
}

/** WMO weather code: 0 clear, 1-3 clouds, 45/48 fog, 51+ precip, 71+ snow, 80+ showers, 95+ storm */
function isClearOrPartlyCloudy(code: number): boolean {
  return code >= 0 && code <= 3;
}

function isRainOrStorm(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
}

function isSnow(code: number): boolean {
  return code >= 71 && code <= 77;
}

export function scoreDailyForecast(daily: DailyForecast): DayScore[] {
  const days: DayScore[] = [];
  const len = daily.time.length;

  for (let i = 0; i < len; i++) {
    const date = daily.time[i] ?? "";
    const tempMax = getOrZero(daily.temperature_2m_max, i);
    const tempMin = getOrZero(daily.temperature_2m_min, i);
    const tempMean = (tempMax + tempMin) / 2;
    const precip = getOrZero(daily.precipitation_sum, i);
    const snow = getOrZero(daily.snowfall_sum, i);
    const precipProb = getOrZero(daily.precipitation_probability_max, i);
    const weatherCode = Math.round(getOrZero(daily.weather_code, i));
    const windMax = getOrZero(daily.wind_speed_10m_max, i);

    // Skiing: cold, snow, low precip as rain
    const skiing =
      tempMean <= 2
        ? 50 + Math.min(30, (2 - tempMean) * 5) + Math.min(20, snow * 2)
        : tempMean <= 8
          ? 30 + Math.min(20, snow)
          : Math.max(0, 40 - (tempMean - 8) * 5);
    const skiingClamped = Math.round(Math.min(100, Math.max(0, skiing)));

    // Surfing: moderate–strong wind, not freezing, low precip
    const windScore =
      windMax >= 15 && windMax <= 45
        ? 40 + (windMax >= 25 ? 30 : (windMax - 15) * 2)
        : windMax > 45
          ? 50
          : windMax >= 10
            ? 20
            : 0;
    const surfTemp = tempMean >= 15 ? 30 : tempMean >= 10 ? 15 : 0;
    const surfPrecip = precip < 2 && !isSnow(weatherCode) ? 30 : 0;
    const surfingClamped = Math.round(
      Math.min(100, Math.max(0, windScore + surfTemp + surfPrecip))
    );

    // Outdoor sightseeing: clear/partly cloudy, comfortable temp, no rain
    const clearScore = isClearOrPartlyCloudy(weatherCode) ? 40 : 10;
    const tempScore =
      tempMean >= 12 && tempMean <= 28
        ? 40
        : tempMean >= 8 && tempMean <= 32
          ? 25
          : 10;
    const dryScore = precip < 1 && precipProb < 30 ? 20 : 0;
    const outdoorClamped = Math.round(
      Math.min(100, Math.max(0, clearScore + tempScore + dryScore))
    );

    // Indoor sightseeing: good when outdoor is bad (rain/clouds), still decent when nice
    const indoorBase = isRainOrStorm(weatherCode) || precip > 2 ? 70 : 50;
    const indoorWeather = !isClearOrPartlyCloudy(weatherCode) ? 20 : 0;
    const indoorClamped = Math.round(
      Math.min(100, Math.max(0, indoorBase + indoorWeather))
    );

    days.push({
      date,
      skiing: skiingClamped,
      surfing: surfingClamped,
      outdoorSightseeing: outdoorClamped,
      indoorSightseeing: indoorClamped,
    });
  }

  return days;
}

export function aggregateScores(days: DayScore[]): {
  skiing: number;
  surfing: number;
  outdoorSightseeing: number;
  indoorSightseeing: number;
} {
  if (days.length === 0)
    return {
      skiing: 0,
      surfing: 0,
      outdoorSightseeing: 0,
      indoorSightseeing: 0,
    };
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  return {
    skiing: Math.round(sum(days.map((d) => d.skiing)) / days.length),
    surfing: Math.round(sum(days.map((d) => d.surfing)) / days.length),
    outdoorSightseeing: Math.round(
      sum(days.map((d) => d.outdoorSightseeing)) / days.length
    ),
    indoorSightseeing: Math.round(
      sum(days.map((d) => d.indoorSightseeing)) / days.length
    ),
  };
}
