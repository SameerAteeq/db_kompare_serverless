const moment = require("moment");

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

module.exports = {
  getTableName,
  sendResponse,
  convertToUnixTimestamp,
  getDayTimestamps,
  formatDateToCompact,
  generateMonthlyDateRanges,
  generateDailyDateRanges,
  delay,
  getYesterdayDate,
  getTwoDaysAgoDate,
};
