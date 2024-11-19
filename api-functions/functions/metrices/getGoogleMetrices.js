const {
  getYesterdayDate,
  sendResponse,
  delay,
} = require("../../helpers/helpers");
const { TABLE_NAME, DATABASE_STATUS } = require("../../helpers/constants");
const {
  getItemByQuery,
  fetchAllItemByDynamodbIndex,
  updateItemInDynamoDB,
} = require("../../helpers/dynamodb");
const { getGoogleMetrics } = require("../../services/googleService");

module.exports.handler = async (event) => {
  try {
    console.log("Fetching all active databases for Google data...");

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
      const { id: databaseId, queries, name } = db;

      if (!queries || queries.length === 0) {
        console.log(
          `Skipped database_id: ${databaseId}, name: ${name} - No queries found.`
        );
        continue; // Skip databases without queries
      }

      console.log(
        `Fetching Google metrics for database_id: ${databaseId}, name: ${name}`
      );

      // Fetch Google metrics
      const googleData = await getGoogleMetrics(queries);

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
          `Skipped database_id: ${databaseId}, name: ${name} - No metrics found for date: ${getYesterdayDate}.`
        );
        continue; // Skip if no metrics exist
      }

      const metric = metricsData.Items[0]; // Assuming one metric entry per database per day

      // Update the metric with Google data
      console.log(
        `Updating metrics for database_id: ${databaseId}, name: ${name}`
      );

      await updateItemInDynamoDB({
        table: TABLE_NAME.METRICES,
        Key: {
          database_id: metric.database_id,
          date: metric.date,
        },
        UpdateExpression: "SET googleData = :googleData",
        ExpressionAttributeValues: {
          ":googleData": googleData,
        },
      });

      console.log(
        `Successfully updated Google data for database_id: ${databaseId}, name: ${name}`
      );

      // Add a delay between processing each database to avoid API rate limits
      await delay(5000);
    }

    return sendResponse(200, "Google data updated successfully", true);
  } catch (error) {
    console.error("Error updating Google data metrics:", error);
    return sendResponse(500, "Failed to update Google data metrics", {
      error: error.message,
    });
  }
};
