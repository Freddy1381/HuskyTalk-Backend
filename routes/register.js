//express is the framework we're going to use to handle requests
const express = require("express");
const jwt = require("jsonwebtoken");

//Access the connection to Heroku Database
const pool = require("../utilities").pool;

const validation = require("../utilities").validation;
let isStringProvided = validation.isStringProvided;

const generateHash = require("../utilities").generateHash;
const generateSalt = require("../utilities").generateSalt;

const sendEmail = require("../utilities").sendEmail;

const router = express.Router();

/**
 * @api {post} /auth Request to register a user
 * @apiName PostAuth
 * @apiGroup Auth
 *
 * @apiBody {String} first a users first name
 * @apiBody {String} last a users last name
 * @apiBody {String} email a users email *unique
 * @apiBody {String} password a users password
 * @apiBody {String} [username] a username *unique, if none provided, email will be used
 *
 * @apiParamExample {json} Request-Body-Example:
 *  {
 *      "first":"Charles",
 *      "last":"Bryan",
 *      "email":"cfb3@fake.email",
 *      "username":"charles", 
 *      "password":"test12345"
 *  }
 *
 * @apiSuccess (Success 201) {boolean} success true when the name is inserted
 * @apiSuccess (Success 201) {String} email the email of the user inserted
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 *
 * @apiError (400: Username exists) {String} message "Username exists"
 *
 * @apiError (400: Email exists) {String} message "Email exists"
 *
 */
router.post(
  "/",
  (request, response, next) => {
    //Verify that the caller supplied all the parameters
    //In js, empty strings or null values evaluate to false
    if (
      isStringProvided(request.body.first) &&
      isStringProvided(request.body.last) &&
      isStringProvided(request.body.username) &&
      isStringProvided(request.body.email) &&
      isStringProvided(request.body.password)
    ) {
      next();
    } else {
      response.status(400).send({
        message: "Missing required information",
      });
    }
  },
  (request, response, next) => {
    //We're using placeholders ($1, $2, $3) in the SQL query string to avoid SQL Injection
    //If you want to read more: https://stackoverflow.com/a/8265319
    let theQuery =
      "INSERT INTO MEMBERS(FirstName, LastName, Username, Email) VALUES ($1, $2, $3, $4) RETURNING Email, MemberID";
    let values = [
      request.body.first,
      request.body.last,
      request.body.username,
      request.body.email,
    ];
    pool
      .query(theQuery, values)
      .then((result) => {
        //stash the memberid into the request object to be used in the next function
        request.memberid = result.rows[0].memberid;
        next();
      })
      .catch((error) => {
        //log the error
        // console.log(error)
        if (error.constraint == "members_username_key") {
          response.status(400).send({
            message: "Username exists",
          });
        } else if (error.constraint == "members_email_key") {
          response.status(400).send({
            message: "Email exists",
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
  (request, response) => {
    //We're storing salted hashes to make our application more secure
    //If you're interested as to what that is, and why we should use it
    //watch this youtube video: https://www.youtube.com/watch?v=8ZtInClXe1Q
    let salt = generateSalt(32);
    let salted_hash = generateHash(request.body.password, salt);

    let theQuery =
      "INSERT INTO CREDENTIALS(MemberId, SaltedHash, Salt) VALUES ($1, $2, $3)";
    let values = [request.memberid, salted_hash, salt];
    const token = jwt.sign(
      { data: 'Token Data' }, 
      'ourSecretKey', { expiresIn: '10m' });
    pool
      .query(theQuery, values)
      .then((result) => {
        //We successfully added the user!
        response.status(201).send({
          success: true,
          email: request.body.email,
          username: request.body.username, 
          token: token.compact
        });
        sendEmail(
          process.env.BURNER_EMAIL,
          request.body.email,
          "Welcome to our App!", 
          request.body.username,
          token
        );
      })
      .catch((error) => {
        //log the error for debugging
        console.log(error)

        /***********************************************************************
         * If we get an error inserting the PWD, we should go back and remove
         * the user from the member table. We don't want a member in that table
         * without a PWD! That implementation is up to you if you want to add
         * that step.
         **********************************************************************/

        response.status(400).send({
          message: "other error, see detail",
          detail: error.detail,
        });
      });
  }
);

module.exports = router;