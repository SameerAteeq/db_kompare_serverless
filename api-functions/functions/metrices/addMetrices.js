const {
  getYesterdayDate,
  getTwoDaysAgoDate,
  sendResponse,
  delay,
  calculateGitHubPopularity,
  calculateOverallPopularity,
  calculateBingPopularity,
  calculateStackOverflowPopularity,
  calculateGooglePopularity,
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
    console.log("Fetching all active databases...");

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
      const { id: databaseId, queries } = db;

      if (!queries || queries.length === 0) {
        console.log(`No queries found for database_id: ${databaseId}`);
        continue; // Skip databases without queries
      }

      // Fetch GitHub metrics for the first query
      console.log(
        `Fetching GitHub metrics for database_id: ${databaseId} with query: ${queries[0]}`
      );
      // const githubData = await getGitHubMetrics(queries[0]);

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
          ":date": getTwoDaysAgoDate,
        },
      });

      if (!metricsData.Items || metricsData.Items.length === 0) {
        console.log(
          `No metrics found for database_id: ${databaseId} on date: ${getYesterdayDate}`
        );
        continue; // Skip if no metrics exist
      }

      const metric = metricsData.Items[0];
      // const googleData = await getGoogleMetrics(queries);
      // Update the metric with GitHub data
      console.log(`Updating metrics for database_id: ${databaseId}`);
      await updateItemInDynamoDB({
        table: TABLE_NAME.METRICES,
        Key: {
          database_id: metric.database_id,
          date: getTwoDaysAgoDate,
        },
        UpdateExpression: "SET popularity.githubScore =:githubScore",
        // UpdateExpression:
        //   "SET popularity.stackoverflowScore = :stackoverflowScore, popularity.githubScore = :githubScore, popularity.totalScore = :totalScore, popularity.googleScore = :googleScore, popularity.bingScore = :bingScore, ",

        ExpressionAttributeValues: {
          // ":githubData": githubData,
          ":githubScore": calculateGitHubPopularity(metric.githubData),
          // ":googleScore": calculateGooglePopularity(metric.googleData),
          // ":stackoverflowScore": calculateStackOverflowPopularity(
          //   metric.stackOverflowData
          // ),
          // ":bingScore": calculateBingPopularity(metric.bingData),
          // ":totalScore": calculateOverallPopularity(metric.popularity),
        },
      });
      await updateItemInDynamoDB({
        table: TABLE_NAME.METRICES,
        Key: {
          database_id: metric.database_id,
          date: getTwoDaysAgoDate,
        },
        UpdateExpression:
          "SET popularity = if_not_exists(popularity, :emptyMap), popularity.githubScore = :githubScore",
        ExpressionAttributeValues: {
          ":emptyMap": {}, // Initialize `popularity` as an empty map if it does not exist
          ":githubScore": calculateGitHubPopularity(metric.githubData),
        },
      });

      // await updateItemInDynamoDB({
      //   table: TABLE_NAME.METRICES,
      //   Key: {
      //     database_id: databaseId,
      //     date: getYesterdayDate,
      //   },
      //   UpdateExpression:
      //     "SET githubData = :githubData , popularity.githubScore = :githubScore",
      //   ExpressionAttributeValues: {
      //     ":githubData": githubData,
      //     ":githubScore": calculateGitHubPopularity(githubData),
      //   },
      // });

      console.log(
        `Successfully updated GitHub data for database_id: ${databaseId}`
      );
    }

    return sendResponse(200, "GitHub metrics updated successfully", true);
  } catch (error) {
    console.error("Error updating GitHub metrics:", error);
    return sendResponse(500, "Failed to update GitHub metrics", error.message);
  }
};
