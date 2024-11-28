// import {
//   getYesterdayDate,
//   sendResponse,
//   calculateGitHubPopularity,
// } from "../../helpers/helpers.js";
// import { TABLE_NAME, DATABASE_STATUS } from "../../helpers/constants.js";
// import {
//   getItemByQuery,
//   fetchAllItemByDynamodbIndex,
//   batchWriteItems,
// } from "../../helpers/dynamodb.js";
// import { v4 as uuidv4 } from "uuid";

import { fetchAllItemByDynamodbIndex } from "../../helpers/dynamodb";

const { TABLE_NAME } = require("../../helpers/constants");

// export const handler = async (event) => {
//   try {
//     console.log("Fetching all active databases...");

//     // Fetch all active databases
//     const databases = await fetchAllItemByDynamodbIndex({
//       TableName: TABLE_NAME.DATABASES,
//       IndexName: "byStatus",
//       KeyConditionExpression: "#status = :statusVal",
//       ExpressionAttributeValues: {
//         ":statusVal": DATABASE_STATUS.ACTIVE, // Active databases
//       },
//       ExpressionAttributeNames: {
//         "#status": "status",
//       },
//     });

//     if (!databases || databases.length === 0) {
//       console.log("No active databases found.");
//       return sendResponse(404, "No active databases found.", null);
//     }

//     // Fetch metrics data for the previous day (yesterday)
//     const yesterday = "2024-11-18"; // Ensure this returns the correct date string (e.g., '2024-11-23')

//     // Process each database in parallel using Promise.all
//     const databasesWithRankings = await Promise.all(
//       databases.map(async (db) => {
//         const { id: databaseId, name } = db;

//         // Check if metrics exist for this database and date
//         const metricsData = await getItemByQuery({
//           table: TABLE_NAME.METRICES,
//           KeyConditionExpression:
//             "#database_id = :database_id and #date = :date",
//           ExpressionAttributeNames: {
//             "#database_id": "database_id",
//             "#date": "date",
//           },
//           ExpressionAttributeValues: {
//             ":database_id": databaseId,
//             ":date": yesterday,
//           },
//         });

//         if (!metricsData || metricsData.Items.length === 0) {
//           console.log(`No metrics found for database_id: ${databaseId}`);
//           return null;
//         }

//         const metric = metricsData.Items[0];

//         // Extract ui_popularity.totalScore
//         const uiPopularity = metric?.ui_popularity;

//         // Return the object containing database details and its popularity score
//         return {
//           databaseId,
//           name,
//           uiPopularity,
//         };
//       })
//     );

//     // Filter out any null results (i.e., databases with no metrics)
//     const validDatabases = databasesWithRankings.filter(Boolean);

//     // Sort the databases by ui_popularity.totalScore in descending order
//     const sortedDatabases = validDatabases.sort(
//       (a, b) => b.uiPopularity.totalScore - a.uiPopularity.totalScore
//     );

//     // Create the rankings array for the day
//     const rankings = sortedDatabases.map((db, index) => ({
//       databaseId: db.databaseId,
//       rank: index + 1, // Rank starts from 1
//       ui_popularity: db.uiPopularity,
//     }));

//     // Prepare the item to be written to DynamoDB
//     const item = {
//       id: uuidv4(),
//       date: yesterday,
//       includeMe: "YES", // You can change this as needed
//       rankings: rankings,
//     };
//     console.log("item", item);
//     // Save the rankings in the DatabaseRankings table
//     await batchWriteItems(TABLE_NAME.DATABASE_RANKINGS, [item]);
//     console.log(`Successfully updated daily rankings for ${yesterday}`);

//     // Finally, sending the response
//     return sendResponse(200, "Rankings updated successfully", true);
//   } catch (error) {
//     console.error("Error updating rankings:", error);
//     return sendResponse(500, "Failed to update rankings", error.message);
//   }
// };
// Use DocumentClient for easier interaction with DynamoDB

export const handler = async (event) => {
  // Extract the start and end dates from the event (or use default values)
  const startDate = event.startDate || "2024-11-18";
  const endDate = event.endDate || "2024-11-18";

  // Query parameters for GSI - querying for "includeMe = YES" and a date range
  const queryParams = {
    TableName: TABLE_NAME.DATABASE_RANKINGS, // Use environment variable for table name
    IndexName: "byStatusAndDate", // GSI index name
    KeyConditionExpression:
      "#includeMe = :includeMeVal and #date between :startDate and :endDate",
    ExpressionAttributeNames: {
      "#includeMe": "includeMe", // GSI partition key
      "#date": "date", // GSI sort key
    },
    ExpressionAttributeValues: {
      ":includeMeVal": "YES", // Filtering by includeMe value (e.g., "YES")
      ":startDate": startDate, // Start date for the range
      ":endDate": endDate, // End date for the range
    },
  };

  try {
    // Call the helper function to fetch all items based on the query parameters
    const allItems = await fetchAllItemByDynamodbIndex(queryParams);

    // If no items were returned
    if (allItems.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message:
            "No rankings found for the specified date range and includeMe status.",
        }),
      };
    }

    // Return the items fetched from DynamoDB
    return {
      statusCode: 200,
      body: JSON.stringify(allItems),
    };
  } catch (error) {
    // Handle any errors
    console.error("Error fetching items:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to fetch items from DynamoDB",
        error: error.message,
      }),
    };
  }
};
