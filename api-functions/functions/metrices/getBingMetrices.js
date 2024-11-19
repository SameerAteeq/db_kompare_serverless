const {
  getYesterdayDate,
  getTwoDaysAgoDate,
  sendResponse,
  delay,
} = require("../../helpers/helpers");
const { TABLE_NAME, DATABASE_STATUS } = require("../../helpers/constants");
const {
  getItemByQuery,
  fetchAllItemByDynamodbIndex,
  updateItemInDynamoDB,
} = require("../../helpers/dynamodb");
const { getBingMetrics } = require("../../services/bingService");

module.exports.handler = async (event) => {
  try {
    console.log("Fetching all active databases for Bing data...");

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

      // Skip databases without queries
      if (!queries || queries.length === 0) {
        console.log(
          `Skipped database_id: ${databaseId}, name: ${name} - No queries found.`
        );
        continue;
      }

      console.log(
        `Processing database_id: ${databaseId}, name: ${name} with queries: ${queries}`
      );

      // Fetch metrics for two days ago
      const twoDaysAgoMetrics = await getItemByQuery({
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
      console.log("twoDaysAgoMetrics", twoDaysAgoMetrics);
      let bingData = [];
      let isBingDataCopied;
      bingData = await getBingMetrics(queries);
      isBingDataCopied = false;
      //   if (!twoDaysAgoMetrics.Items) {
      //     bingData = await getBingMetrics(queries);
      //     isBingDataCopied = false; // Indicates data is fresh
      //   } else if (twoDaysAgoMetrics.Items[0]?.isBingDataCopied) {
      //     bingData = await getBingMetrics(queries);
      //     isBingDataCopied = false; // Indicates data is fresh
      //   } else {
      //     bingData = twoDaysAgoMetrics.Items[0]?.bingData || [];
      //     isBingDataCopied = true; // Indicates data is reused
      //   }
      //   if (
      //     !twoDaysAgoMetrics.Items ||
      //     twoDaysAgoMetrics.Items.length === 0 || // No metrics exist for two days ago
      //     twoDaysAgoMetrics.Items[0]?.isBingDataCopied // Previous data was copied
      //   ) {
      //     // Fetch new Bing data if previous data was copied
      //     bingData = await getBingMetrics(queries);
      //     isBingDataCopied = false; // Indicates data is fresh
      //   } else {
      //     // Reuse existing Bing data if available
      //     bingData = twoDaysAgoMetrics.Items[0]?.bingData || [];
      //     isBingDataCopied = true; // Indicates data is reused
      //   }

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

      // Update the metric with Bing data
      console.log(
        `Updating metrics for database_id: ${databaseId}, name: ${name}`
      );
      await updateItemInDynamoDB({
        table: TABLE_NAME.METRICES,
        Key: {
          database_id: metric.database_id,
          date: metric.date,
        },
        UpdateExpression:
          "SET bingData = :bingData, isBingDataCopied = :isCopied",
        ExpressionAttributeValues: {
          ":bingData": bingData,
          ":isCopied": isBingDataCopied,
        },
      });

      console.log(
        `Successfully updated Bing data for database_id: ${databaseId}, name: ${name}`
      );

      // Add a delay to avoid API rate limits
      await delay(5000);
    }

    return sendResponse(200, "Bing data updated successfully", true);
  } catch (error) {
    console.error("Error updating Bing data metrics:", error);
    return sendResponse(500, "Failed to update Bing data metrics", {
      error: error.message,
    });
  }
};
