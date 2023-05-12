const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, `${process.env.NODE_ENV}.env`),
});

module.exports = {
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || "default",
  NODE_ENV: process.env.NODE_ENV || "default",
  PORT: process.env.PORT || 5000,
  DB_OPTIONS:
    process.env.NODE_ENV === "local"
      ? {
          connectionString: process.env.DATABASE_URL,
        }
      : {
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false,
          },
        },
  JSON_WEB_TOKEN: process.env.JSON_WEB_TOKEN || undefined
};
