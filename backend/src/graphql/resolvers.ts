import { getForecast, searchLocation } from "../openMeteo/client.js";
import { aggregateScores, scoreDailyForecast } from "../ranking/scorers.js";

export const resolvers = {
  Query: {
    async getCityRanking(
      _: unknown,
      { city }: { city: string }
    ): Promise<Record<string, unknown> | null> {
      if (!city?.trim()) return null;

      const geo = await searchLocation(city.trim());
      const first = geo.results?.[0];
      if (!first) return null;

      const forecast = await getForecast(
        first.latitude,
        first.longitude,
        first.timezone
      );

      const dailyScores = scoreDailyForecast(forecast.daily);
      const overall = aggregateScores(dailyScores);

      return {
        location: {
          id: first.id,
          name: first.name,
          latitude: first.latitude,
          longitude: first.longitude,
          timezone: first.timezone,
          countryCode: first.country_code,
          country: first.country,
        },
        overall,
        daily: dailyScores.map((d) => ({
          date: d.date,
          skiing: d.skiing,
          surfing: d.surfing,
          outdoorSightseeing: d.outdoorSightseeing,
          indoorSightseeing: d.indoorSightseeing,
        })),
      };
    },

    health(): string {
      return "ok";
    },
  },
};
