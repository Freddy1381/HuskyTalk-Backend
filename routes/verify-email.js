const config = require("../config.js");

//express is the framework we're going to use to handle requests
const express = require("express");

//Access the connection to Heroku Database
const pool = require("../utilities").pool;

const validation = require("../utilities").validation;
let isStringProvided = validation.isStringProvided;

const router = express.Router();

//Pull in the JWT module along with out a secret key
const jwt = require("jsonwebtoken");
const key = {
  secret: config.JSON_WEB_TOKEN,
};

/**
 * @api {post} /verify-email Request to sign a user in the system
 * @apiName PostVerifyEmail
 * @apiGroup Verify-email
 * 
 * @apiParamExample {json} Request-Body-Example:
 *  {
 *      "username":"charles1",
 *      "email":"cfb3@fake.email"
 *  }
 *
 * @apiBody {String} username a users username
 * @apiBody {String} email a users email
 * 
 * @apiSuccess (Success 200) {boolean} success true when the email is verified
 * @apiSuccess (Success 200) {string} response message
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 *
 * @apiError (404: User Not Found) {String} message "User not found"
 *
 */
router.post(
    "/",
    (request, response, next) => {
      //Verify that the caller supplied all the parameters
      //In js, empty strings or null values evaluate to false
      if (
        isStringProvided(request.body.username) &&
        isStringProvided(request.body.email)
      ) {
        next();
      } else {
        response.status(400).send({
          message: "Missing required information",
        });
      }
    },
    (request, response, next) => {
        //We're using placeholders ($1, $2) in the SQL query string to avoid SQL Injection
        let theQuery =
          "UPDATE MEMBERS SET Verification = 1 WHERE Username = $1 AND Email = $2 RETURNING Email, Username";
        let values = [
          request.body.username,
          request.body.email,
        ];
        pool
          .query(theQuery, values)
          .then((result) => {
            response.status(200).send({
                success: true,
                message: "Email verified successfully!",
              });
          })
          .catch((error) => {
            //log the error
            // console.log(error)
            // TODO handle error messages for username/email not found, mismatched combination
            if (error.constraint == "") {
              response.status(404).send({
                message: "",
              });
            } else if (error.constraint == "") {
              response.status(400).send({
                message: "",
              });
            } else {
              console.log(error);
              response.status(400).send({
                message: "other error, see detail",
                detail: error.detail,
              });
            }
          });
      },
)