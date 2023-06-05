//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool

const router = express.Router()

const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided

/**
 * @apiDefine JSONError
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */ 

/**
 * @api {post} /friends Request to add a friend
 * @apiName PostFriends
 * @apiGroup Friends
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {String} name the name for the friend
 * 
 * @apiSuccess (Success 201) {boolean} success true when the name is inserted
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiError (400: Unknown member username) {String} message "Username not registered on app"
 * 
 * @apiUse JSONError
 */ 
router.post("/", (request, response, next) => {
    if (!isStringProvided(request.body.username)) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else {
        next()
    }
}, (request, response, next) => {
    let query = `SELECT MemberId FROM Members WHERE Username = $1`;
    let values = [request.body.username]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount > 0) {
                request.memberid = result.rows[0].memberid
                next()
            } else {
                response.status(400).send({
                    message: "Username not registered on app"
                })
            }
        }).catch(err => {
            response.status(400).send({
                message: "SQL error at confirm username while adding friend.",
                error: err
            });
        });
}, (request, response, next) => {
    let query = `SELECT memberid_a, memberid_b FROM contacts WHERE memberid_a = $1 AND memberid_b = $2`;
    let values = [request.decoded.memberid, request.memberid];

    pool.query(query, values)
        .then(result => {
            if (result.rowCount = 0) {
                next()
            } else {
                response.status(400).send({
                    message: "Users are already friends."
                })
            }
        }).catch(err => {
            response.status(400).send({
                message: "SQL error at confirm already friends.",
                error: err
            });
        })
}, (request, response) => {
    let query = `INSERT INTO contacts (memberid_a, memberid_b) VALUES ($1, $2)`
    let values = [request.decoded.memberid, request.memberid]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount > 0) {
                response.send({
                    message: "user successfully added as friend!", 
                    success: true
                });
            } else {
                response.status(400).send({
                    message: "Error while adding user as friend"
                });
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error at post friend",
                error: error
            });
        });
});

/**
 * @api {get} /friends Request to get a list of friends of the logged in user
 * @apiName GetFriends
 * @apiGroup friends
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiSuccess {Number} rowCount the number of messages returned
 * @apiSuccess {Object[]} members List of friends with their username and email
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get('/',(request, response) => {
    let query = `SELECT Username, Email FROM Members WHERE memberid IN (SELECT memberid_b FROM contacts WHERE memberid_a=$1)`;
    let values = [request.decoded.memberid];
        
    pool.query(query, values)
        .then(result => {
            response.status(200).send({
                success: true, 
                message: "Friends list successfully obtained. ", 
                friends: result.rows
            })
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error at get friends list",
                error: error
            })
        })
})

module.exports = router