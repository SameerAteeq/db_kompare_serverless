const DynamoDB = require("aws-sdk/clients/dynamodb");
const DynamoDBClient = new DynamoDB.DocumentClient();
const { getTableName } = require("./helpers");

let createItemInDynamoDB = (
  itemAttributes,
  table,
  expressionAttributes,
  conditionExpression
) => {
  let tableParams = {
    Item: itemAttributes,
    TableName: getTableName(table),
    ExpressionAttributeNames: expressionAttributes,
    ConditionExpression: conditionExpression,
  };

  return DynamoDBClient.put(tableParams).promise();
};

let createItemOrUpdate = (itemAttributes, table) => {
  let tableParams = {
    Item: itemAttributes,
    TableName: getTableName(table),
  };

  return DynamoDBClient.put(tableParams).promise();
};

const getItemByQuery = ({
  table,
  KeyConditionExpression,
  ExpressionAttributeNames,
  ExpressionAttributeValues,
  IndexName,
  Limit,
  ExclusiveStartKey,
  ScanIndexForward,
  FilterExpression,
}) => {
  var params = {
    TableName: getTableName(table),
    KeyConditionExpression,
    // ExpressionAttributeNames,
    ExpressionAttributeValues,
  };

  if (ExpressionAttributeNames) {
    params["ExpressionAttributeNames"] = ExpressionAttributeNames;
  }
  if (IndexName) {
    params["IndexName"] = IndexName;
  }
  if (Limit) {
    params["Limit"] = Limit;
  }
  if (ExclusiveStartKey) {
    params["ExclusiveStartKey"] = ExclusiveStartKey;
  }
  if (ScanIndexForward) {
    params["ScanIndexForward"] = ScanIndexForward;
  }
  if (FilterExpression) {
    params["FilterExpression"] = FilterExpression;
  }

  return DynamoDBClient.query(params).promise();
};

let getItemByIndex = (
  table,
  IndexName,
  KeyConditionExpression,
  ExpressionAttributeNames,
  ExpressionAttributeValues
) => {
  var params = {
    TableName: getTableName(table),
    IndexName,
    KeyConditionExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };

  return DynamoDBClient.query(params).promise();
};

const getItem = (table, Key) => {
  const params = {
    TableName: table,
    Key,
  };
  return DynamoDBClient.get(params).promise();
};

const writeBatchItems = (table, items) => {
  const params = {
    RequestItems: {
      [getTableName(table)]: items,
    },
  };

  return DynamoDBClient.batchWrite(params).promise();
};

const writeBatchItemsInMultipleTables = (params) => {
  return DynamoDBClient.batchWrite(params).promise();
};

const getBatchItems = (table, Keys) => {
  let params = {
    RequestItems: {
      [getTableName(table)]: { Keys },
    },
  };

  return DynamoDBClient.batchGet(params).promise();
};

let scan = (params) => {
  params["TableName"] = getTableName(params["TableName"]);
  return DynamoDBClient.scan(params).promise();
};

let describeTable = (params) => {
  params["TableName"] = getTableName(params["TableName"]);
  return DynamoDBClient.describeTable(params).promise();
};

const deleteItem = (table, Key) => {
  var params = {
    TableName: getTableName(table),
    Key,
    ReturnValues: "ALL_OLD",
  };

  return DynamoDBClient.delete(params).promise();
};

let updateItemInDynamoDB = ({
  table,
  Key,
  UpdateExpression,
  ExpressionAttributeValues,
  ReturnValues,
  ExpressionAttributeNames,
  ConditionExpression,
}) => {
  let params = {
    TableName: getTableName(table),
    Key,
    UpdateExpression,
    ExpressionAttributeValues,
    ReturnValues: ReturnValues ? ReturnValues : "ALL_NEW",
  };
  if (ExpressionAttributeNames) {
    params["ExpressionAttributeNames"] = ExpressionAttributeNames;
  }

  if (ConditionExpression) {
    params["ConditionExpression"] = ConditionExpression;
  }

  return DynamoDBClient.update(params).promise();
};

let transactWriteInDynamoDB = (items) => {
  return DynamoDBClient.transactWrite(items).promise();
};
const fetchAllItemByDynamodbIndex = async ({
  TableName,
  IndexName,
  KeyConditionExpression,
  ExpressionAttributeValues,
  FilterExpression = null,
  ExpressionAttributeNames = null,
  Limit = null,
}) => {
  let lastEvaluatedKey = undefined;
  const allItems = [];

  try {
    do {
      const params = {
        TableName,
        IndexName,
        KeyConditionExpression,
        ExpressionAttributeValues,
        ExclusiveStartKey: lastEvaluatedKey,
        ScanIndexForward: true,
      };

      if (FilterExpression) {
        params.FilterExpression = FilterExpression;
      }

      if (ExpressionAttributeNames) {
        params.ExpressionAttributeNames = ExpressionAttributeNames;
      }

      if (Limit) {
        params.Limit = Limit;
      }

      const response = await DynamoDBClient.query(params).promise();

      allItems.push(...response.Items);
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);
  } catch (error) {
    console.log("Failed to fetch items:", JSON.stringify(error));
    throw new Error("Error fetching items from DynamoDB", error);
  }

  return allItems;
};
module.exports = {
  transactWriteInDynamoDB,
  createItemInDynamoDB,
  createItemOrUpdate,
  getItemByQuery,
  getItem,
  writeBatchItems,
  getItemByIndex,
  getBatchItems,
  scan,
  deleteItem,
  updateItemInDynamoDB,
  writeBatchItemsInMultipleTables,
  describeTable,
  fetchAllItemByDynamodbIndex,
};
