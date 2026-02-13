export const typeDefs = `#graphql
  type Location {
    id: Int!
    name: String!
    latitude: Float!
    longitude: Float!
    timezone: String!
    countryCode: String!
    country: String!
  }

  type DayRanking {
    date: String!
    skiing: Int!
    surfing: Int!
    outdoorSightseeing: Int!
    indoorSightseeing: Int!
  }

  type ActivityRankings {
    skiing: Int!
    surfing: Int!
    outdoorSightseeing: Int!
    indoorSightseeing: Int!
  }

  type CityRanking {
    location: Location!
    overall: ActivityRankings!
    daily: [DayRanking!]!
  }

  type Query {
    "Get activity rankings for a city over the next 7 days (by name search)"
    getCityRanking(city: String!): CityRanking
    "Health check for k8s probes"
    health: String
  }
`;
