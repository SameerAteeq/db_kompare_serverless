// const { getDayTimestamps } = require("../helpers/helpers.js");

// const axios = require("axios");
// const moment = require("moment");

// const STACKOVERFLOW_KEY = process.env.STACK_API_KEY;
// const STACKEXCHANGE_API_URL = "https://api.stackexchange.com/2.3";

// async function getStackOverflowMetrics(databaseName) {
//   // Get yesterday's date and format it
//   const date = moment().subtract(1, "days").format("YYYY-MM-DD");
//   // const date = "2024-11-05";
//   try {
//     const { totalQuestions, totalViewCount } =
//       await getStackOverflowQuestionsCount(databaseName, date);
//     const totalQuestionsAllTime = await getStackOverflowQuestionsCountAllTime(
//       databaseName
//     );
//     console.log(
//       "metrics in sflow",
//       totalQuestions,
//       totalViewCount,
//       totalQuestionsAllTime
//     );

//     return { totalQuestions, totalViewCount, totalQuestionsAllTime };
//   } catch (error) {
//     console.error(
//       `Error fetching Stack Overflow data for ${databaseName}:`,
//       error.message
//     );
//     return null;
//   }
// }

// async function getStackOverflowQuestionsCount(databaseName, date) {
//   try {
//     const { startOfDay, endOfDay } = getDayTimestamps(date);
//     const params = {
//       order: "desc",
//       sort: "activity",
//       tagged: databaseName,
//       site: "stackoverflow",
//       key: STACKOVERFLOW_KEY,
//       fromdate: startOfDay,
//       todate: endOfDay,
//       pagesize: 100, // Limit to 100 questions per page
//     };

//     let totalQuestions = 0;
//     let totalViewCount = 0;
//     let hasMore = true;
//     let page = 1;

//     // Loop through all pages to accumulate view counts
//     while (hasMore) {
//       const response = await axios.get(`${STACKEXCHANGE_API_URL}/questions`, {
//         params: { ...params, page },
//       });

//       const questions = response.data.items || [];
//       totalQuestions += questions.length;

//       // Calculating total view count
//       totalViewCount += questions.reduce(
//         (sum, question) => sum + (question.view_count || 0),
//         0
//       );

//       hasMore = response.data.has_more; // Check if more pages exist
//       page += 1;
//     }

//     return { totalQuestions, totalViewCount };
//   } catch (error) {
//     console.error(
//       `Error fetching Stack Overflow questions count and view count for ${databaseName} on ${date}:`,
//       error.message
//     );
//     return null;
//   }
// }

// // Function to fetch questions without a date range (all-time count)
// async function getStackOverflowQuestionsCountAllTime(databaseName) {
//   try {
//     const params = {
//       order: "desc",
//       sort: "activity",
//       tagged: databaseName,
//       site: "stackoverflow",
//       key: STACKOVERFLOW_KEY,
//       filter: "total",
//     };

//     const response = await axios.get(`${STACKEXCHANGE_API_URL}/questions`, {
//       params: { ...params },
//     });
//     const questions = response.data.total;
//     return questions;
//   } catch (error) {
//     console.error(
//       `Error fetching all-time Stack Overflow questions count for ${databaseName}:`,
//       error.message
//     );
//     return null;
//   }
// }
// module.exports = {
//   getStackOverflowMetrics,
// };

import axios from "axios";
import moment from "moment";
import { getDayTimestamps } from "../helpers/helpers.js";

const STACKOVERFLOW_KEY = process.env.STACK_API_KEY;
const STACKEXCHANGE_API_URL = "https://api.stackexchange.com/2.3";

// Concurrency limit for API requests
const MAX_CONCURRENT_REQUESTS = 3;
const REQUEST_DELAY = 1000; // Delay between batch requests (milliseconds)

// Retry logic for transient errors
async function withRetry(fn, retries = 3, delayTime = 1000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayTime));
      } else {
        throw error;
      }
    }
  }
}

// Fetch metrics for questions in a date range
async function getStackOverflowQuestionsCount(databaseName, date) {
  const { startOfDay, endOfDay } = getDayTimestamps(date);
  const params = {
    order: "desc",
    sort: "activity",
    tagged: databaseName,
    site: "stackoverflow",
    key: STACKOVERFLOW_KEY,
    fromdate: startOfDay,
    todate: endOfDay,
    pagesize: 100,
  };

  let totalQuestions = 0;
  let totalViewCount = 0;
  let hasMore = true;
  let page = 1;

  // const limit = pLimit(MAX_CONCURRENT_REQUESTS);

  try {
    while (hasMore) {
      const response = await withRetry(() =>
        axios.get(`${STACKEXCHANGE_API_URL}/questions`, {
          params: { ...params, page },
        })
      );

      const questions = response.data.items || [];
      totalQuestions += questions.length;

      // Accumulate view counts
      totalViewCount += questions.reduce(
        (sum, question) => sum + (question.view_count || 0),
        0
      );

      hasMore = response.data.has_more;
      page++;

      // Respect rate limits
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
      }
    }

    return { totalQuestions, totalViewCount };
  } catch (error) {
    console.error(
      `Error fetching Stack Overflow metrics for ${databaseName} on ${date}:`,
      error.message
    );
    return { totalQuestions: 0, totalViewCount: 0 }; // Fallback for errors
  }
}

// Fetch all-time questions count
async function getStackOverflowQuestionsCountAllTime(databaseName) {
  const params = {
    order: "desc",
    sort: "activity",
    tagged: databaseName,
    site: "stackoverflow",
    key: STACKOVERFLOW_KEY,
    filter: "total",
  };

  try {
    const response = await withRetry(() =>
      axios.get(`${STACKEXCHANGE_API_URL}/questions`, { params })
    );
    return response.data.total || 0;
  } catch (error) {
    console.error(
      `Error fetching all-time Stack Overflow questions count for ${databaseName}:`,
      error.message
    );
    return 0; // Fallback for errors
  }
}

// Fetch combined Stack Overflow metrics
async function getStackOverflowMetrics(databaseName) {
  const date = moment().subtract(1, "days").format("YYYY-MM-DD");

  try {
    console.log(
      `Fetching Stack Overflow metrics for ${databaseName} on ${date}`
    );

    const [dailyMetrics, allTimeQuestions] = await Promise.all([
      getStackOverflowQuestionsCount(databaseName, date),
      getStackOverflowQuestionsCountAllTime(databaseName),
    ]);

    const { totalQuestions, totalViewCount } = dailyMetrics;

    console.log(
      `Metrics for ${databaseName}: Questions: ${totalQuestions}, Views: ${totalViewCount}, All-Time Questions: ${allTimeQuestions}`
    );

    return {
      totalQuestions,
      totalViewCount,
      totalQuestionsAllTime: allTimeQuestions,
    };
  } catch (error) {
    console.error(
      `Error fetching combined Stack Overflow metrics for ${databaseName}:`,
      error.message
    );
    return null;
  }
}

module.exports = { getStackOverflowMetrics };
