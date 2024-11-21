const {
  getYesterdayDate,
  getTwoDaysAgoDate,
  sendResponse,
  delay,
  calculateStackOverflowPopularity,
} = require("../../helpers/helpers");
const { TABLE_NAME, DATABASE_STATUS } = require("../../helpers/constants");
const {
  getItem,
  getItemByQuery,
  createItemInDynamoDB,
  fetchAllItemByDynamodbIndex,
  batchWriteItems,
  updateItemInDynamoDB,
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
    console.log("Fetching all active databases for stackOverflowData...");

    // Fetch all active databases
    const databases = await fetchAllItemByDynamodbIndex({
      TableName: TABLE_NAME.DATABASES,
      IndexName: "byStatus",
      KeyConditionExpression: "#status = :statusVal",
      ExpressionAttributeValues: {
        ":statusVal": DATABASE_STATUS.ACTIVE, // Active databases
      },
      ExpressionAttributeNames: {
        "#status": "status",
      },
    });

    if (!databases || databases.length === 0) {
      console.log("No active databases found.");
      return sendResponse(404, "No active databases found", null);
    }

    // Process each database
    for (const db of databases) {
      const { id: databaseId, stack_overflow_tag, name } = db;

      if (!stack_overflow_tag) {
        console.log(
          `No stack_overflow_tag found for database_id: ${databaseId} name :${name}`
        );
        continue; // Skip databases without queries
      }

      // Check if metrics exist for this database and date
      const metricsData = await getItemByQuery({
        table: TABLE_NAME.METRICES,
        KeyConditionExpression: "#database_id = :database_id and #date = :date",
        ExpressionAttributeNames: {
          "#database_id": "database_id",
          "#date": "date",
        },
        ExpressionAttributeValues: {
          ":database_id": databaseId,
          ":date": getYesterdayDate,
        },
      });

      const metric = metricsData.Items[0];

      // if Google data already exist in our database then it should skip that database
      if (metric.stackOverflowData) {
        continue;
      }
      // Fetch stackoverflow metrics
      const stackOverflowData = await getStackOverflowMetrics(
        stack_overflow_tag
      );

      // Updating the popularity Object
      const updatedPopularity = {
        ...metric?.popularity,
        stackoverflowScore: calculateStackOverflowPopularity(stackOverflowData),
      };

      // Updating the database to add github data and github score in our database
      await updateItemInDynamoDB({
        table: TABLE_NAME.METRICES,
        Key: {
          database_id: databaseId,
          date: getYesterdayDate,
        },
        UpdateExpression:
          "SET #popularity = :popularity, #stackOverflowData = :stackOverflowData",
        ExpressionAttributeNames: {
          "#popularity": "popularity",
          "#stackOverflowData": "stackOverflowData",
        },
        ExpressionAttributeValues: {
          ":popularity": updatedPopularity,
          ":stackOverflowData": stackOverflowData,
        },
        ConditionExpression:
          "attribute_exists(#popularity) OR attribute_not_exists(#popularity)",
      });

      console.log(
        `Successfully updated stackOverflowData data for name :${name}`
      );
    }

    return sendResponse(
      200,
      "stackOverflowData metrics updated successfully",
      true
    );
  } catch (error) {
    console.error("Error updating stackOverflowData metrics:", error);
    return sendResponse(
      500,
      "Failed to update stackOverflowData metrics",
      error.message
    );
  }
};
