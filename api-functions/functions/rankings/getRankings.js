import { TABLE_NAME } from "../../helpers/constants.js";
import {
  getItem,
  fetchAllItemByDynamodbIndex,
} from "../../helpers/dynamodb.js";
import { getPastThreeDates, sendResponse } from "../../helpers/helpers.js";

export const handler = async (event) => {
  try {
    const { startDate, endDate, middleDate } = getPastThreeDates();

    // Define the base query parameters
    let queryParams = {
      TableName: TABLE_NAME.METRICES,
      IndexName: "byStatusAndDate",
      KeyConditionExpression:
        "#includeMe = :includeMeVal , AND #date BETWEEN :startDate AND :endDate",
      ExpressionAttributeNames: {
        "#includeMe": "includeMe",
        "#date": "date",
      },
      ExpressionAttributeValues: {
        ":includeMeVal": "YES",
        ":startDate": startDate,
        ":endDate": endDate,
      },
    };

    // Fetch items from DynamoDB
    const items = await fetchAllItemByDynamodbIndex(queryParams);
    const transformedData = await transformData(
      items,
      startDate,
      middleDate,
      endDate
    );
    return sendResponse(200, "Fetch metrices successfully", transformedData);
  } catch (error) {
    console.error("Error fetching metrices:", error);
    return sendResponse(500, "Failed to fetch metrices", {
      error: error.message,
    });
  }
};

// Get database name
const getDatabaseNameById = async (databaseId) => {
  const key = {
    id: databaseId,
  };
  try {
    const result = await getItem(TABLE_NAME.DATABASES, key);
    if (result.Item) {
      return result.Item;
    }
    return "Unknown"; // Fallback if the database name is not found
  } catch (error) {
    console.error(`Error fetching database name for ID ${databaseId}:`, error);
    throw error;
  }
};

const transformData = async (items, startDate, middleDate, endDate) => {
  // Group items by `databaseId`
  const groupedData = items.reduce((acc, item) => {
    const { database_id: databaseId, date, popularity, ui_popularity } = item;

    // Ensure the database entry exists in the accumulator
    if (!acc[databaseId]) {
      acc[databaseId] = {
        databaseId,
        databaseName: "Fetching...",
        databaseModel: "Fetching...",
        ranking: [],
        score: [],
      };
    }

    // Add score
    acc[databaseId].score.push({
      date,
    });

    return acc;
  }, {});

  // Fetch database names for each unique databaseId
  const databaseIds = Object.keys(groupedData);
  await Promise.all(
    databaseIds.map(async (databaseId) => {
      const databaseDetail = await getDatabaseNameById(databaseId);
      groupedData[databaseId].databaseName = databaseDetail.name;
      groupedData[databaseId].databaseModel =
        databaseDetail.primary_database_model;
    })
  );

  // Convert the grouped object to an array
  return Object.values(groupedData);
};
