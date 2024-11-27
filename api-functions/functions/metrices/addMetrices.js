import {
  getYesterdayDate,
  sendResponse,
  calculateGitHubPopularity,
} from "../../helpers/helpers.js";
import { TABLE_NAME, DATABASE_STATUS } from "../../helpers/constants.js";
import {
  getItemByQuery,
  fetchAllItemByDynamodbIndex,
  batchWriteItems,
} from "../../helpers/dynamodb.js";

export const handler = async (event) => {
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
      return sendResponse(404, "No active databases found.", null);
    }

    // Fetch metrics data for the previous day (yesterday)
    const yesterday = getYesterdayDate; // Ensure this returns the correct date string (e.g., '2024-11-23')

    // Process each database in parallel using Promise.all
    const databasesWithRankings = await Promise.all(
      databases.map(async (db) => {
        const { id: databaseId, name } = db;

        // Check if metrics exist for this database and date
        const metricsData = await getItemByQuery({
          table: TABLE_NAME.METRICES,
          KeyConditionExpression:
            "#database_id = :database_id and #date = :date",
          ExpressionAttributeNames: {
            "#database_id": "database_id",
            "#date": "date",
          },
          ExpressionAttributeValues: {
            ":database_id": databaseId,
            ":date": "2024-11-22",
          },
        });

        if (!metricsData || metricsData.Items.length === 0) {
          console.log(`No metrics found for database_id: ${databaseId}`);
          return null;
        }

        const metric = metricsData.Items[0];
        console.log("metric", metric, metricsData);
        // Extract ui_popularity.totalScore
        const uiPopularity = metric?.ui_popularity?.totalScore;

        // Return the object containing database details and its popularity score
        return {
          databaseId,
          name,
          uiPopularity,
        };
      })
    );

    // Filter out any null results (i.e., databases with no metrics)
    const validDatabases = databasesWithRankings.filter(Boolean);

    // Sort the databases by ui_popularity.totalScore in descending order
    const sortedDatabases = validDatabases.sort(
      (a, b) => b.uiPopularity - a.uiPopularity
    );

    // Create ranking items
    const batchItems = sortedDatabases.map((db, index) => ({
      database_id: db.databaseId,
      databaseName: db.name,
      date: "2024-11-22",
      rank: index + 1, // Rank starts from 1
      totalScore: db.uiPopularity,
    }));
    console.log("batchItems", batchItems);
    // Save the rankings in the DatabaseRankings table using batch write
    if (batchItems.length > 0) {
      await batchWriteItems(TABLE_NAME.DATABASE_RANKINGS, batchItems);
      console.log(`Successfully updated daily rankings for ${yesterday}`);
    }

    // Finally, sending the response
    return sendResponse(200, "Rankings updated successfully", true);
  } catch (error) {
    console.error("Error updating rankings:", error);
    return sendResponse(500, "Failed to update rankings", error.message);
  }
};
