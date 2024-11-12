const getTableName = (name) => {
  return `${name}`;
};

const sendResponse = (statusCode, message, data) => {
  return {
    statusCode,
    body: JSON.stringify({
      message,
      data,
    }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    },
  };
};

module.exports = {
  getTableName,
  sendResponse,
};
