const AWS = require("aws-sdk");
const { getBingMetrics } = require("../../services/bingService");
const { getGitHubMetrics } = require("../../services/githubService");
const { getGoogleMetrics } = require("../../services/googleService");
const {
  getStackOverflowMetrics,
} = require("../../services/stackOverflowService");

const {
  getYesterdayDate,
  getTwoDaysAgoDate,
} = require("../../helpers/helpers");
const { TABLE_NAME } = require("../../helpers/constants");
const {
  getItem,
  getItemByIndex,
  getItemByQuery,
  createItemInDynamoDB,
} = require("../../helpers/dynamodb");

module.exports.handler = async (event) => {
  try {
    const { databaseId } = JSON.parse(event.body);
    console.log("Filtered and validated params:", JSON.stringify(databaseId));
    // Check if databaseId is provided
    if (!databaseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "databaseId is required" }),
      };
    }

    // Fetch the database document
    const databaseData = getItem(TABLE_NAME.DATABASES, { id: databaseId });
    const databaseDoc = databaseData.Item;

    if (!databaseDoc) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Database document not found" }),
      };
    }

    const { queries, stack_overflow_tag } = databaseDoc;

    if (!queries || !stack_overflow_tag) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Database document not found" }),
      };
    }
    const metricsData = await getItemByQuery({
      TABLE_NAME: TABLE_NAME.METRICES,
      KeyConditionExpression: "databaseId = :databaseId and #date = :date",
      ExpressionAttributeNames: {
        "#date": "date",
      },
      ExpressionAttributeValues: {
        ":databaseId": databaseId,
        ":date": getYesterdayDate,
      },
    });
    const isMetricsExist = metricsData.Items.length > 0;

    if (isMetricsExist) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Metrics already exist for today" }),
      };
    }

    // Fetch metrics data (GitHub, Stack Overflow, Google, Bing)
    const [githubData, stackOverflowData, googleData, bingData] =
      await Promise.all([
        getGitHubMetrics(queries[0]),
        getStackOverflowMetrics(stack_overflow_tag),
        getGoogleMetrics(queries),
        getBingMetrics(queries),
      ]);

    // Prepare and save the metrics document
    const newMetrics = {
      TableName: TABLE_NAME.METRICES,
      Item: {
        databaseId: databaseId,
        date: getYesterdayDate,
        githubData,
        stackOverflowData,
        googleData,
        bingData,
      },
    };

    await createItemInDynamoDB(newMetrics.Item, newMetrics.TableName);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Metrics added successfully",
        newMetrics: newMetrics.Item,
      }),
    };
  } catch (error) {
    console.error("Error adding daily count:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to add daily count" }),
    };
  }
};
