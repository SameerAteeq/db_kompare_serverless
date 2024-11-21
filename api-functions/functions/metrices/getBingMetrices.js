const {
  getYesterdayDate,
  getTwoDaysAgoDate,
  sendResponse,
  delay,
  calculateBingPopularity,
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
      console.log("No active databases found for BING");
      return sendResponse(404, "No active databases found for BING", null);
    }

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

      // if BING data already exist in our database then it should skip that database
      if (metric.bingData) {
        continue;
      }

      // Fetch metrics for two days ago because we need to check bing copied data
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

      // Creating variables to store data
      let bingData = [];
      let isBingDataCopied;

      // Checking if the data is copied or fresh in our database then updating values according to that
      if (twoDaysAgoMetrics.Items[0]?.isBingDataCopied) {
        bingData = await getBingMetrics(queries);
        isBingDataCopied = false; // Indicates data is fresh
      } else {
        bingData = twoDaysAgoMetrics.Items[0]?.bingData || [];
        isBingDataCopied = true; // Indicates data is reused
      }

      // Updating the popularity Object
      const updatedPopularity = {
        ...metric?.popularity,
        bingScore: calculateBingPopularity(bingData),
      };

      // Updating the database to add BING data and BING score in our database
      await updateItemInDynamoDB({
        table: TABLE_NAME.METRICES,
        Key: {
          database_id: databaseId,
          date: getYesterdayDate,
        },
        UpdateExpression:
          "SET #popularity = :popularity, #bingData = :bingData",
        ExpressionAttributeNames: {
          "#popularity": "popularity",
          "#bingData": "bingData",
        },
        ExpressionAttributeValues: {
          ":popularity": updatedPopularity,
          ":bingData": bingData,
        },
        ConditionExpression:
          "attribute_exists(#popularity) OR attribute_not_exists(#popularity)",
      });

      console.log(`Successfully updated Bing data for name: ${name}`);
    }

    return sendResponse(200, "Bing data updated successfully", true);
  } catch (error) {
    console.error("Error updating Bing data metrics:", error);
    return sendResponse(500, "Failed to update Bing data metrics", {
      error: error.message,
    });
  }
};
