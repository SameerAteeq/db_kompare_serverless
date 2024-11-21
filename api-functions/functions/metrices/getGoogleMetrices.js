const {
  getYesterdayDate,
  sendResponse,
  delay,
  calculateGooglePopularity,
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
      console.log("No active databases found for google");
      return sendResponse(404, "No active databases found for google", null);
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

      // if Google data already exist in our database then it should skip that database
      if (metric.googleData) {
        continue;
      }
      // Fetch Google metrics
      const googleData = await getGoogleMetrics(queries);

      // Updating the popularity Object
      const updatedPopularity = {
        ...metric?.popularity,
        googleScore: calculateGooglePopularity(googleData),
      };

      // Updating the database to add github data and github score in our database
      await updateItemInDynamoDB({
        table: TABLE_NAME.METRICES,
        Key: {
          database_id: databaseId,
          date: getYesterdayDate,
        },
        UpdateExpression:
          "SET #popularity = :popularity, #googleData = :googleData",
        ExpressionAttributeNames: {
          "#popularity": "popularity",
          "#googleData": "googleData",
        },
        ExpressionAttributeValues: {
          ":popularity": updatedPopularity,
          ":googleData": googleData,
        },
        ConditionExpression:
          "attribute_exists(#popularity) OR attribute_not_exists(#popularity)",
      });

      console.log(`Successfully updated Google data for name: ${name}`);
    }

    return sendResponse(200, "Google data updated successfully", true);
  } catch (error) {
    console.error("Error updating Google data metrics:", error);
    return sendResponse(500, "Failed to update Google data metrics", {
      error: error.message,
    });
  }
};
