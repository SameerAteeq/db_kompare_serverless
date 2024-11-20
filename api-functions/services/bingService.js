const { delay } = require("../helpers/helpers.js");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const BING_API_KEY = process.env.BING_API_KEY;
const BING_API_URL = "https://api.bing.microsoft.com/v7.0/search";

async function getBingMetrics(queries) {
  console.log("BING_API_KEY", BING_API_KEY, queries);
  try {
    const headers = { "Ocp-Apim-Subscription-Key": BING_API_KEY };
    const results = [];

    for (const query of queries) {
      const params = { q: query };

      // Fetch today's data
      const response = await axios.get(BING_API_URL, { headers, params });
      const totalEstimatedMatches =
        response.data.webPages.totalEstimatedMatches;

      results.push({
        query,
        totalEstimatedMatches,
      });
      await delay(3000);
    }

    return results;
  } catch (error) {
    console.error(`Error fetching Bing data:`, error.message);
    return null;
  }
}

module.exports = { getBingMetrics };
