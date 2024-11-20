const moment = require("moment");
const { RESOURCE_TYPE } = require("./constants");

const getTableName = (name) => {
  return `${name}`;
};

const sendResponse = (statusCode, message, data) => {
  return {
    statusCode,
    body: JSON.stringify({
      message,
      data,
    }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    },
  };
};

const convertToUnixTimestamp = (date) =>
  Math.floor(new Date(date).getTime() / 1000);

const getDayTimestamps = (dateString) => {
  // Parse the date string (e.g., "2024-01-19")
  const date = new Date(dateString);

  // Set to start of the day (00:00:00) in UTC and get UNIX timestamp
  const startOfDay = Math.floor(
    new Date(date.setUTCHours(0, 0, 0, 0)).getTime() / 1000
  );

  // Set to end of the day (23:59:59) in UTC and get UNIX timestamp
  const endOfDay = Math.floor(
    new Date(date.setUTCHours(23, 59, 59, 999)).getTime() / 1000
  );

  return { startOfDay, endOfDay };
};

const formatDateToCompact = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }

  return dateString.replace(/-/g, "");
};

const generateMonthlyDateRanges = (year) => {
  const dateRanges = [];
  for (let month = 1; month <= 12; month++) {
    const start = moment.utc([year, month - 1, 1]).format("YYYY-MM-DD");
    const end = moment
      .utc([year, month - 1])
      .endOf("month")
      .format("YYYY-MM-DD");
    dateRanges.push({ start, end });
  }
  return dateRanges;
};

const generateDailyDateRanges = (year) => {
  const dateRanges = [];
  const startOfYear = moment.utc([year, 0, 1]); // Start of the year (January 1st)
  const endOfYear = moment.utc([year, 11, 31]); // End of the year (December 31st)

  // Loop through each day of the year
  let currentDate = startOfYear;
  while (currentDate.isSameOrBefore(endOfYear)) {
    // Format the current date as YYYY-MM-DD
    const date = currentDate.format("YYYY-MM-DD");
    // Push the date as both the start and end of the range
    dateRanges.push({ start: date, end: date });
    // Move to the next day
    currentDate.add(1, "day");
  }

  // Return the array of date ranges for each day
  return dateRanges;
};

// Utility function for delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Get yesterday's date and format it
const getYesterdayDate = moment().subtract(1, "days").format("YYYY-MM-DD");

// Get the date for two days ago and format it
const getTwoDaysAgoDate = moment().subtract(2, "days").format("YYYY-MM-DD");

const calculateGitHubPopularity = ({ totalIssues, totalStars, totalRepos }) => {
  return (totalStars * 0.1 + totalRepos * 0.6 - totalIssues * 0.3) * 100000;
};

const calculateStackOverflowPopularity = ({
  totalQuestions,
  totalQuestionsAllTime,
  totalViewCount,
}) => {
  return (
    (totalQuestions * 0.7 + totalViewCount * 0.3) * 100000 +
    totalQuestionsAllTime
  );
};

const calculateGooglePopularity = (data) => {
  // Calculate the total sum of `totalResults`
  const totalResultsSum = data
    .filter((value) => value.totalResults)
    .reduce((sum, value) => sum + value.totalResults, 0);

  // Aggregate weighted values for all queries
  const weightedSum = data.reduce((sum, value) => {
    const totalResultsWithoutDate = value.totalResultsWithoutDate || 0;
    const totalResultsWithDate = value.totalResultsWithDate || 0;

    return sum + totalResultsWithoutDate * 0.002 + totalResultsWithDate * 0.448;
  }, 0);

  // Apply the final formula
  return weightedSum - totalResultsSum * 0.5;
};

const calculateBingPopularity = (data) => {
  // Extract `totalEstimatedMatches` for the first query
  const firstQueryMatches = data[0].totalEstimatedMatches || 0;

  // Sum up `totalEstimatedMatches` for all other queries
  const totalQueriesSum = data.slice(1).reduce((sum, item) => {
    return sum + (item.totalEstimatedMatches || 0);
  }, 0);

  // Apply the formula
  return firstQueryMatches * 0.5 - totalQueriesSum * 0.5;
};

const calculateOverallPopularity = ({
  googleScore,
  githubScore,
  bingScore,
  stackoverflowScore,
}) => {
  return (
    googleScore * 0.2 +
    bingScore * 0.1 +
    githubScore * 0.4 +
    stackoverflowScore * 0.3
  );
};

const getPopularityByFormula = (resourceType, data) => {
  switch (resourceType) {
    case RESOURCE_TYPE.GITHUB:
      return calculateGitHubPopularity(data);
    case RESOURCE_TYPE.STACKOVERFLOW:
      return calculateStackOverflowPopularity(data);
    case RESOURCE_TYPE.GOOGLE:
      return calculateGooglePopularity(data);
    case RESOURCE_TYPE.BING:
      return calculateBingPopularity(data);
    case RESOURCE_TYPE.ALL:
      return calculateOverallPopularity(data);
    default:
      throw new Error("Invalid resource type");
  }
};

module.exports = {
  getTableName,
  sendResponse,
  convertToUnixTimestamp,
  getDayTimestamps,
  formatDateToCompact,
  generateMonthlyDateRanges,
  generateDailyDateRanges,
  delay,
  getPopularityByFormula,
  calculateGitHubPopularity,
  calculateStackOverflowPopularity,
  calculateGooglePopularity,
  calculateBingPopularity,
  calculateOverallPopularity,
  getYesterdayDate,
  getTwoDaysAgoDate,
};
