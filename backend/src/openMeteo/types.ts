export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
  country_code: string;
  country: string;
  admin1?: string;
}

export interface GeocodingResponse {
  results?: GeocodingResult[];
}

export interface DailyForecast {
  time: string[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_sum: (number | null)[];
  snowfall_sum: (number | null)[];
  precipitation_probability_max: (number | null)[];
  weather_code: (number | null)[];
  wind_speed_10m_max: (number | null)[];
  cloud_cover_mean?: (number | null)[];
}

export interface ForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: DailyForecast;
}
