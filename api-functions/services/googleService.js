const { delay } = require("../helpers/helpers.js");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const GOOGLE_API_URL = "https://www.googleapis.com/customsearch/v1";

async function getGoogleMetrics(queries) {
  try {
    const results = [];

    // Run the first query without dateRestrict
    const firstQueryParamsWithoutDate = {
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CSE_ID,
      q: queries[0],
      fields: "items(title,link,snippet),searchInformation(totalResults)",
    };

    const responseWithoutDate = await axios.get(GOOGLE_API_URL, {
      params: firstQueryParamsWithoutDate,
    });

    const totalResultsWithoutDate =
      parseInt(responseWithoutDate.data.searchInformation.totalResults, 10) ||
      0;

    results.push({
      query: queries[0],
      totalResultsWithoutDate,
    });

    // Run the first query again with dateRestrict
    const firstQueryParamsWithDate = {
      ...firstQueryParamsWithoutDate,
      dateRestrict: "d1", // Restricts to the last day
    };

    const responseWithDate = await axios.get(GOOGLE_API_URL, {
      params: firstQueryParamsWithDate,
    });

    const totalResultsWithDate =
      parseInt(responseWithDate.data.searchInformation.totalResults, 10) || 0;

    results.push({
      query: queries[0],
      totalResultsWithDate,
    });

    // Run the rest of the queries with dateRestrict
    for (let i = 1; i < queries.length; i++) {
      // Add delay before each request
      await delay(2000);
      const params = {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CSE_ID,
        q: queries[i],
        fields: "items(title,link,snippet),searchInformation(totalResults)",
        dateRestrict: "d1",
      };

      const response = await axios.get(GOOGLE_API_URL, { params });

      const totalResults =
        parseInt(response.data.searchInformation.totalResults, 10) || 0;

      results.push({
        query: queries[i],
        totalResults,
      });
    }
    console.log("metrics in google", results);
    return results;
  } catch (error) {
    console.error(`Error fetching Google data`, error.message);
    return null;
  }
}

module.exports = { getGoogleMetrics };
