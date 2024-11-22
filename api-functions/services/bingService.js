import axios from "axios";
import pLimit from "p-limit";

const BING_API_KEY = process.env.BING_API_KEY;
const BING_API_URL = "https://api.bing.microsoft.com/v7.0/search";

export async function getBingMetrics(queries) {
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
