const { createItemInDynamoDB } = require("../../helpers/dynamodb");
const { v4: uuidv4 } = require("uuid");
const { TABLE_NAME } = require("../../helpers/constants");
const { sendResponse } = require("../../helpers/helpers");

module.exports.handler = async (event, context, callback) => {
  const params = JSON.parse(event.body);

  console.log("params", JSON.stringify(params));

  try {
    await createItemInDynamoDB(
      { ...params, id: uuidv4() },
      TABLE_NAME.DATABASES,
      { "#id": "id" },
      "attribute_not_exists(#id)",
      false
    );

    return sendResponse(200, "Database Created Successfully", true);
  } catch (error) {
    return sendResponse(500, "Internal Server Error", error.message);
  }
};
