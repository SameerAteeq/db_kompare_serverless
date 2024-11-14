const { createItemInDynamoDB } = require("../../helpers/dynamodb");
const { v4: uuidv4 } = require("uuid");
const { TABLE_NAME, DATABASE_STATUS } = require("../../helpers/constants");
const { sendResponse } = require("../../helpers/helpers");

module.exports.handler = async (event, context, callback) => {
  // Parse the incoming request body
  let params = JSON.parse(event.body);

  // Validate the parameters
  const validation = validateParams(params);
  if (!validation.isValid) {
    // Return a 400 response if validation fails
    return sendResponse(400, "Invalid request parameters", validation.message);
  }

  // Filter to include only allowed fields
  params = Object.keys(params)
    .filter((key) => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = params[key];
      return obj;
    }, {});

  // Add a unique ID to the item
  params.id = uuidv4();
  params.status = DATABASE_STATUS.ACTIVE;

  console.log("Filtered and validated params:", JSON.stringify(params));

  try {
    await createItemInDynamoDB(
      params,
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
const allowedFields = [
  "name",
  "description",
  "primary_database_model",
  "secondary_database_models",
  "db_compare_ranking",
  "website",
  "technical_documentation",
  "developer",
  "initial_release",
  "current_release",
  "license",
  "cloud_based_only",
  "dbaas_offerings",
  "implementation_language",
  "server_operating_systems",
  "data_scheme",
  "typing",
  "xml_support",
  "secondary_indexes",
  "sql",
  "apis_and_other_access_methods",
  "supported_programming_languages",
  "server_side_scripts",
  "triggers",
  "partitioning_methods",
  "replication_methods",
  "mapreduce",
  "consistency_concepts",
  "foreign_keys",
  "transaction_concepts",
  "concurrency",
  "durability",
  "in_memory_capabilities",
  "user_concepts",
];

// Validate function to check allowed fields and types
function validateParams(params) {
  // Check for disallowed fields
  const invalidFields = Object.keys(params).filter(
    (key) => !allowedFields.includes(key)
  );
  if (invalidFields.length > 0) {
    return {
      isValid: false,
      message: `Invalid fields: ${invalidFields.join(
        ", "
      )}. Only allowed fields are accepted.`,
    };
  }

  return { isValid: true };
}
