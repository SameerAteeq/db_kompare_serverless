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

    console.log(`Found ${databases.length} active databases.`);

    // Process each database
    for (const db of databases) {
      const { id: databaseId, stack_overflow_tag, name } = db;

      if (!stack_overflow_tag) {
        console.log(
          `No stack_overflow_tag found for database_id: ${databaseId} name :${name}`
        );
        continue; // Skip databases without queries
      }

      // Fetch GitHub metrics for the first query
      console.log(
        `Fetching stackoverflow metrics for database_id: ${databaseId} name :${name} with query: ${stack_overflow_tag}`
      );
      const stackOverflowData = await getStackOverflowMetrics(
        stack_overflow_tag
      );

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

      if (!metricsData.Items || metricsData.Items.length === 0) {
        console.log(
          `No metrics found for database_id: ${databaseId} on date: ${getYesterdayDate} name :${name}`
        );
        continue; // Skip if no metrics exist
      }

      const metric = metricsData.Items[0]; // Assuming one metric entry per database per day

      // Update the metric with GitHub data
      console.log(
        `Updating metrics for database_id: ${databaseId} name :${name}`
      );

      await updateItemInDynamoDB({
        table: TABLE_NAME.METRICES,
        Key: {
          database_id: databaseId,
          date: getYesterdayDate,
        },
        UpdateExpression:
          "SET stackOverflowData = :stackOverflowData, popularity.stackoverflowScore = :stackoverflowScore",
        ExpressionAttributeValues: {
          ":stackOverflowData": stackOverflowData,
          ":stackoverflowScore":
            calculateStackOverflowPopularity(stackOverflowData),
        },
      });

      console.log(
        `Successfully updated stackOverflowData data for database_id: ${databaseId} name :${name}`
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
