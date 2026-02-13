import { config } from "../config.js";
import type { ForecastResponse, GeocodingResponse } from "./types.js";

export async function searchLocation(name: string): Promise<GeocodingResponse> {
  const url = new URL(config.openMeteo.geocodingUrl);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "5");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  return res.json() as Promise<GeocodingResponse>;
}

export async function getForecast(
  latitude: number,
  longitude: number,
  timezone: string
): Promise<ForecastResponse> {
  const url = new URL(config.openMeteo.forecastUrl);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "snowfall_sum",
      "precipitation_probability_max",
      "weather_code",
      "wind_speed_10m_max",
    ].join(",")
  );
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Forecast failed: ${res.status}`);
  return res.json() as Promise<ForecastResponse>;
}
