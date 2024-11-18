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
    const databases = await fetchAllItemByDynamodbIndex({
      TableName: TABLE_NAME.DATABASES, // Use the table name constant
      IndexName: "byStatus",
      KeyConditionExpression: "#status = :statusVal",
      ExpressionAttributeValues: {
        ":statusVal": DATABASE_STATUS.ACTIVE, // Example: if you want to filter by active status
      },
      ExpressionAttributeNames: {
        "#status": "status",
      },
    });

    if (!databases || databases.length === 0) {
      console.log("No databases found.");
      return sendResponse(404, "No databases found", error.message);
    }

    // Create items for each database
    const newItems = databases.map((db) => ({
      id: uuidv4(),
      database_id: db.id,
      date: getYesterdayDate,
    }));

    await batchWriteItems(TABLE_NAME.METRICES, newItems);

    return sendResponse(200, "Created Metrices basic detail", true);
  } catch (error) {
    console.error("Error adding daily count:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to add daily count" }),
    };
  }
};
