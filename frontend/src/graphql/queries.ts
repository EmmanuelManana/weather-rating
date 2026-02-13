import { gql } from "@apollo/client";

export const GET_CITY_RANKING = gql`
  query GetCityRanking($city: String!) {
    getCityRanking(city: $city) {
      location {
        id
        name
        latitude
        longitude
        timezone
        countryCode
        country
      }
      overall {
        skiing
        surfing
        outdoorSightseeing
        indoorSightseeing
      }
      daily {
        date
        skiing
        surfing
        outdoorSightseeing
        indoorSightseeing
      }
    }
  }
`;
