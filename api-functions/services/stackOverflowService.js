const { getDayTimestamps } = require("../helpers/helpers.js");

const axios = require("axios");
const moment = require("moment");

const STACKOVERFLOW_KEY = process.env.STACK_API_KEY;
const STACKEXCHANGE_API_URL = "https://api.stackexchange.com/2.3";

async function getStackOverflowMetrics(databaseName) {
  // Get yesterday's date and format it
  const date = moment().subtract(1, "days").format("YYYY-MM-DD");
  // const date = "2024-11-05";
  try {
    const { totalQuestions, totalViewCount } =
      await getStackOverflowQuestionsCount(databaseName, date);
    const totalQuestionsAllTime = await getStackOverflowQuestionsCountAllTime(
      databaseName
    );
    console.log(
      "metrics in sflow",
      totalQuestions,
      totalViewCount,
      totalQuestionsAllTime
    );

    return { totalQuestions, totalViewCount, totalQuestionsAllTime };
  } catch (error) {
    console.error(
      `Error fetching Stack Overflow data for ${databaseName}:`,
      error.message
    );
    return null;
  }
}

async function getStackOverflowQuestionsCount(databaseName, date) {
  try {
    const { startOfDay, endOfDay } = getDayTimestamps(date);
    const params = {
      order: "desc",
      sort: "activity",
      tagged: databaseName,
      site: "stackoverflow",
      key: STACKOVERFLOW_KEY,
      fromdate: startOfDay,
      todate: endOfDay,
      pagesize: 100, // Limit to 100 questions per page
    };

    let totalQuestions = 0;
    let totalViewCount = 0;
    let hasMore = true;
    let page = 1;

    // Loop through all pages to accumulate view counts
    while (hasMore) {
      const response = await axios.get(`${STACKEXCHANGE_API_URL}/questions`, {
        params: { ...params, page },
      });

      const questions = response.data.items || [];
      totalQuestions += questions.length;

      // Calculating total view count
      totalViewCount += questions.reduce(
        (sum, question) => sum + (question.view_count || 0),
        0
      );

      hasMore = response.data.has_more; // Check if more pages exist
      page += 1;
    }

    return { totalQuestions, totalViewCount };
  } catch (error) {
    console.error(
      `Error fetching Stack Overflow questions count and view count for ${databaseName} on ${date}:`,
      error.message
    );
    return null;
  }
}

// Function to fetch questions without a date range (all-time count)
async function getStackOverflowQuestionsCountAllTime(databaseName) {
  try {
    const params = {
      order: "desc",
      sort: "activity",
      tagged: databaseName,
      site: "stackoverflow",
      key: STACKOVERFLOW_KEY,
      filter: "total",
    };

    const response = await axios.get(`${STACKEXCHANGE_API_URL}/questions`, {
      params: { ...params },
    });
    const questions = response.data.total;
    return questions;
  } catch (error) {
    console.error(
      `Error fetching all-time Stack Overflow questions count for ${databaseName}:`,
      error.message
    );
    return null;
  }
}
module.exports = {
  getStackOverflowMetrics,
};
