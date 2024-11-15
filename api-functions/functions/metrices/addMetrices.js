const {
  getYesterdayDate,
  getTwoDaysAgoDate,
} = require("../../helpers/helpers");
const { TABLE_NAME } = require("../../helpers/constants");
const {
  getItem,
  getItemByQuery,
  createItemInDynamoDB,
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
    const { databaseId } = JSON.parse(event.body);
    console.log("Filtered and validated params:", JSON.stringify(databaseId));

    // Validate databaseId
    if (!databaseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "databaseId is required" }),
      };
    }

    // Fetch the database document
    const databaseData = await getItem(TABLE_NAME.DATABASES, {
      id: databaseId,
    });
    const databaseDoc = databaseData.Item;
    console.log("Database:", JSON.stringify(databaseDoc));

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
        body: JSON.stringify({ error: "Quereis not found" }),
      };
    }

    // Check metrics for yesterday
    const getMetricsData = await getItemByQuery({
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

    const isMetricsExist = getMetricsData.Items.length > 0;
    if (isMetricsExist) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Metrics already exist for today" }),
      };
    }

    // Check metrics for two days ago
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

    console.log("Two Days Ago Metrics:", twoDaysAgoMetrics);

    // Fetch metrics data
    const metricsData = await fetchMetrics(databaseDoc, twoDaysAgoMetrics);

    // Prepare new metrics
    const newMetrics = {
      TableName: TABLE_NAME.METRICES,
      Item: {
        id: uuidv4(),
        database_id: databaseId,
        date: getYesterdayDate,
        ...metricsData, // Spread fetched metrics, including `is_bingData_copied`
      },
    };

    // Insert new metrics
    await createItemInDynamoDB(
      newMetrics.Item,
      newMetrics.TableName,
      { "#id": "id" },
      "attribute_not_exists(#id)"
    );

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

async function fetchMetrics(databaseDoc, twoDaysAgoMetrics) {
  try {
    const { queries, stack_overflow_tag } = databaseDoc;
    const {
      isBingDataCopied: previousBingDataCopied,
      bingData: existingBingData,
    } = twoDaysAgoMetrics;

    let bingData;
    let isBingDataCopied;
    const data = [
      {
        query: "Microsoft SQL Server",
        totalResultsWithoutDate: 560000,
      },
      {
        query: "Microsoft SQL Server",
        totalResultsWithDate: 100,
      },
      {
        query: "SQL Server issues",
        totalResults: 300,
      },
      {
        query: "SQL Server crash",
        totalResults: 8960,
      },
      {
        query: "SQL Server slow",
        totalResults: 7360,
      },
      {
        query: "SQL Server stuck",
        totalResults: 3410,
      },
    ];
    if (previousBingDataCopied) {
      // Fetch new Bing data since previous data was copied
      // bingData = await getBingMetrics(queries);
      bingData = data;
      isBingDataCopied = false; // Data is fresh, not reused
    } else if (twoDaysAgoMetrics.Items.length > 0) {
      // Reuse Bing data from two days ago
      bingData = twoDaysAgoMetrics.Items[0].bingData || [];
      isBingDataCopied = true; // Data is reused
    }

    // Fetch core metrics in parallel
    const [githubData, stackOverflowData, googleData] = await Promise.all([
      getGitHubMetrics(queries[0]),
      getStackOverflowMetrics(stack_overflow_tag),
      getGoogleMetrics(queries),
    ]);

    return {
      githubData,
      stackOverflowData,
      googleData,
      bingData,
      isBingDataCopied,
    };
  } catch (error) {
    console.error("Error fetching metrics:", error);
    throw new Error("Failed to fetch metrics");
  }
}
