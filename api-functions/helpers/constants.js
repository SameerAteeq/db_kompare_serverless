const TABLE_NAME = {
  DATABASES: process.env.DATABASES_TABLE,
  METRICES: process.env.METRICES_TABLE,
};

const STATUS_CODE = {
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  SUCCESS: 200,
};

const DATABASE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

module.exports = {
  STATUS_CODE,
  TABLE_NAME,
  DATABASE_STATUS,
};
