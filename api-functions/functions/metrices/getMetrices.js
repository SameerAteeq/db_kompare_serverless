const {
  getYesterdayDate,
  getTwoDaysAgoDate,
  sendResponse,
} = require("../../helpers/helpers");
const { TABLE_NAME, DATABASE_STATUS } = require("../../helpers/constants");
const {
  getItem,
  getItemByQuery,
  createItemInDynamoDB,
  fetchAllItemByDynamodbIndex,
  batchWriteItems,
} = require("../../helpers/dynamodb");
const { getGitHubMetrics } = require("../../services/githubService");
const { getGoogleMetrics } = require("../../services/googleService");
const { getBingMetrics } = require("../../services/bingService");
const {
  getStackOverflowMetrics,
} = require("../../services/stackOverflowService");
const { v4: uuidv4 } = require("uuid");

module.exports.handler = async (event) => {
  try {
    // let startDate = "";
    // let endDate = "";
    // // Parse the request body
    // if (event.body) {
    //   const parsedBody = JSON.parse(event.body);
    //   startDate = parsedBody.startDate;
    //   endDate = parsedBody.endDate;
    // } else if (event.queryStringParameters) {
    //   startDate = event.queryStringParameters.startDate;
    //   endDate = event.queryStringParameters.endDate;
    // }

    // // Validate date range if provided
    // if ((startDate && !endDate) || (!startDate && endDate)) {
    //   return sendResponse(
    //     400,
    //     "Both startDate and endDate must be provided for date range filtering."
    //   );
    // }

    // // If dates are provided, ensure they are in the correct format (YYYY-MM-DD)
    // if (startDate && endDate) {
    //   const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    //   if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    //     return sendResponse(
    //       400,
    //       "startDate and endDate must be in YYYY-MM-DD format."
    //     );
    //   }

    //   if (startDate > endDate) {
    //     return sendResponse(400, "startDate cannot be later than endDate.");
    //   }
    // }

    // Define the base query parameters
    let queryParams = {
      TableName: TABLE_NAME.METRICES,
      IndexName: "byStatusAndDate",
      KeyConditionExpression: "#includeMe = :includeMeVal",
      ExpressionAttributeNames: {
        "#includeMe": "includeMe",
      },
      ExpressionAttributeValues: {
        ":includeMeVal": "YES",
      },
    };

    // If date range is provided, add it to the KeyConditionExpression
    // if (startDate && endDate) {
    //   queryParams.KeyConditionExpression +=
    //     " AND #date BETWEEN :startDate AND :endDate";
    //   queryParams.ExpressionAttributeNames["#date"] = "date";
    //   queryParams.ExpressionAttributeValues[":startDate"] = startDate;
    //   queryParams.ExpressionAttributeValues[":endDate"] = endDate;
    // }

    // Fetch items from DynamoDB
    const items = await fetchAllItemByDynamodbIndex(queryParams);

    return sendResponse(200, "Fetch metrices successfully", items);
  } catch (error) {
    console.error("Error fetching metrices:", error);
    return sendResponse(500, "Failed to fetch metrices", {
      error: error.message,
    });
  }
};
