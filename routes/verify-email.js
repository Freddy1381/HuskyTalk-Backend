const config = require("../config.js");

//express is the framework we're going to use to handle requests
const express = require("express");
const jwt = require("jsonwebtoken");

//Access the connection to Heroku Database
const pool = require("../utilities").pool;

const validation = require("../utilities").validation;
let isStringProvided = validation.isStringProvided;

const router = express.Router();

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
router.get(
    "/:username/:token",
    (request, response) => {
      const {token} = request.params;
      const username = request.params.username
      console.log(username);

      //Verify the JWT token
      jwt.verify(token, 'ourSecretKey', function(error, decoded) {
        if (error) {
          console.log("Verification failed")
          response.status(400).send({
            message: error.message
          });
        } else {
          console.log("Verification successful")
          let theQuery =
          "UPDATE MEMBERS SET Verification = 1 WHERE Username = $1";
          let values = [
            username
          ];
          pool
            .query(theQuery, values)
            .then((result) => {
              response.status(200).send({
                  success: true,
                  message: "Email verified successfully!",
                  jwt: decoded
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
        }
      })
});
module.exports = router;