export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  openMeteo: {
    geocodingUrl: "https://geocoding-api.open-meteo.com/v1/search",
    forecastUrl: "https://api.open-meteo.com/v1/forecast",
  },
} as const;
