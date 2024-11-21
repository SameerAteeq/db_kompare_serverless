const axios = require("axios");
const pLimit = require("p-limit");

const BING_API_KEY = process.env.BING_API_KEY;
const BING_API_URL = "https://api.bing.microsoft.com/v7.0/search";

async function getBingMetrics(queries) {
  console.log("BING_API_KEY", BING_API_KEY, queries);

  const headers = { "Ocp-Apim-Subscription-Key": BING_API_KEY };
  const limit = pLimit(3); // Allow up to 3 concurrent requests (Bing API limit)

  try {
    // Map queries to limited promises
    const results = await Promise.all(
      queries.map((query) =>
        limit(async () => {
          try {
            const params = { q: query };
            const response = await axios.get(BING_API_URL, { headers, params });
            return {
              query,
              totalEstimatedMatches:
                response.data.webPages?.totalEstimatedMatches || 0,
            };
          } catch (error) {
            console.error(
              `Error fetching Bing data for query "${query}":`,
              error.message
            );
            return { query, totalEstimatedMatches: 0 }; // Fallback for errors
          }
        })
      )
    );

    return results;
  } catch (error) {
    console.error("Error fetching Bing metrics:", error.message);
    return null;
  }
}

module.exports = { getBingMetrics };

// const { delay } = require("../helpers/helpers.js");
// const axios = require("axios");
// const dotenv = require("dotenv");

// dotenv.config();

// const BING_API_KEY = process.env.BING_API_KEY;
// const BING_API_URL = "https://api.bing.microsoft.com/v7.0/search";

// async function getBingMetrics(queries) {
//   console.log("BING_API_KEY", BING_API_KEY, queries);
//   try {
//     const headers = { "Ocp-Apim-Subscription-Key": BING_API_KEY };
//     const results = [];

//     for (const query of queries) {
//       const params = { q: query };

//       // Fetch today's data
//       const response = await axios.get(BING_API_URL, { headers, params });
//       const totalEstimatedMatches =
//         response.data.webPages.totalEstimatedMatches;

//       results.push({
//         query,
//         totalEstimatedMatches,
//       });
//       await delay(3000);
//     }

//     return results;
//   } catch (error) {
//     console.error(`Error fetching Bing data:`, error.message);
//     return null;
//   }
// }

// module.exports = { getBingMetrics };
