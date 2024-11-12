const { scan } = require("../../helpers/dynamodb"); // Assuming the scan function is in dynamodb helper
const { TABLE_NAME } = require("../../helpers/constants");
const { sendResponse } = require("../../helpers/helpers");

module.exports.handler = async (event, context, callback) => {
  console.log("Fetching all databases");

  const params = {
    TableName: TABLE_NAME.DATABASES, // Use the table name constant
  };

  try {
    // Call the scan function to get all databases
    const data = await scan(params);

    // Check if there are any items in the response and return them
    return sendResponse(200, data.Items, true);
  } catch (error) {
    console.error("Error fetching databases:", error.message);
    return sendResponse(500, "Internal Server Error", error.message);
  }
};
