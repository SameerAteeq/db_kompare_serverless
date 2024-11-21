const axios = require("axios");
const pLimit = require("p-limit");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const GOOGLE_API_URL = "https://www.googleapis.com/customsearch/v1";

// Maximum concurrent requests allowed
const MAX_CONCURRENT_REQUESTS = 3;

async function getGoogleMetrics(queries) {
  try {
    const results = [];
    const limit = pLimit(MAX_CONCURRENT_REQUESTS); // Limit concurrency to 3

    // Helper to fetch Google API data for a single query
    const fetchGoogleData = async (query, withDateRestrict = false) => {
      const params = {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CSE_ID,
        q: query,
        fields: "items(title,link,snippet),searchInformation(totalResults)",
      };

      if (withDateRestrict) {
        params.dateRestrict = "d1"; // Restricts to the last day
      }

      try {
        const response = await axios.get(GOOGLE_API_URL, { params });
        return parseInt(response.data.searchInformation.totalResults, 10) || 0;
      } catch (error) {
        console.error(
          `Error fetching Google data for query "${query}"${
            withDateRestrict ? " with dateRestrict" : ""
          }:`,
          error.message
        );
        return 0; // Fallback for failed requests
      }
    };

    // First query without dateRestrict
    const firstQuery = queries[0];
    const totalResultsWithoutDate = await fetchGoogleData(firstQuery, false);
    const totalResultsWithDate = await fetchGoogleData(firstQuery, true);

    results.push(
      {
        query: firstQuery,
        totalResultsWithoutDate,
      },
      {
        query: firstQuery,
        totalResultsWithDate,
      }
    );

    // Process remaining queries in parallel with concurrency control
    const remainingQueries = queries.slice(1);
    const remainingResults = await Promise.all(
      remainingQueries.map((query) =>
        limit(async () => {
          const totalResults = await fetchGoogleData(query, true);
          return {
            query,
            totalResults,
          };
        })
      )
    );

    // Combine all results
    results.push(...remainingResults);

    console.log("Google Metrics:", results);
    return results;
  } catch (error) {
    console.error(`Error fetching Google metrics:`, error.message);
    return null;
  }
}

module.exports = { getGoogleMetrics };

// const { delay } = require("../helpers/helpers.js");
// const axios = require("axios");
// const dotenv = require("dotenv");
// dotenv.config();

// const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
// const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
// const GOOGLE_API_URL = "https://www.googleapis.com/customsearch/v1";

// async function getGoogleMetrics(queries) {
//   try {
//     const results = [];

//     // Run the first query without dateRestrict
//     const firstQueryParamsWithoutDate = {
//       key: GOOGLE_API_KEY,
//       cx: GOOGLE_CSE_ID,
//       q: queries[0],
//       fields: "items(title,link,snippet),searchInformation(totalResults)",
//     };

//     const responseWithoutDate = await axios.get(GOOGLE_API_URL, {
//       params: firstQueryParamsWithoutDate,
//     });

//     const totalResultsWithoutDate =
//       parseInt(responseWithoutDate.data.searchInformation.totalResults, 10) ||
//       0;

//     results.push({
//       query: queries[0],
//       totalResultsWithoutDate,
//     });

//     // Run the first query again with dateRestrict
//     const firstQueryParamsWithDate = {
//       ...firstQueryParamsWithoutDate,
//       dateRestrict: "d1", // Restricts to the last day
//     };

//     const responseWithDate = await axios.get(GOOGLE_API_URL, {
//       params: firstQueryParamsWithDate,
//     });

//     const totalResultsWithDate =
//       parseInt(responseWithDate.data.searchInformation.totalResults, 10) || 0;

//     results.push({
//       query: queries[0],
//       totalResultsWithDate,
//     });

//     // Run the rest of the queries with dateRestrict
//     for (let i = 1; i < queries.length; i++) {
//       // Add delay before each request
//       await delay(2000);
//       const params = {
//         key: GOOGLE_API_KEY,
//         cx: GOOGLE_CSE_ID,
//         q: queries[i],
//         fields: "items(title,link,snippet),searchInformation(totalResults)",
//         dateRestrict: "d1",
//       };

//       const response = await axios.get(GOOGLE_API_URL, { params });

//       const totalResults =
//         parseInt(response.data.searchInformation.totalResults, 10) || 0;

//       results.push({
//         query: queries[i],
//         totalResults,
//       });
//     }
//     console.log("metrics in google", results);
//     return results;
//   } catch (error) {
//     console.error(`Error fetching Google data`, error.message);
//     return null;
//   }
// }

// module.exports = { getGoogleMetrics };
