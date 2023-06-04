//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool

const router = express.Router()

const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided

/**
 * @api {get} /previews Request to get the chat name, preview, and timestamp of a chat
 * @apiName GetPreview
 * @apiGroup Previews
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiSuccess {String} chatname the name of the chat room
 * @apiSuccess {String} preview most recent message of the chat room
 * @apiSuccess {TimeStamp} timestamp timestamp of most recent message of the chat room
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get('/',(request, response, next) => {
    let query = 'SELECT chatid, Name FROM Chats WHERE chatid in (SELECT chatid FROM chatmembers WHERE memberid = $1) ORDER BY chatid';
    let values = [request.decoded.memberid];
    const chatrooms = []

    pool.query(query, values)
        .then(result => {
            if (result.rowCount > 0) {
                for (let i = 0; i < result.rowCount; i++) {
                    chatrooms[i] = result.rows[i]
                }
                request.rooms = chatrooms
                next()
            } else {
                response.status(400).send({
                    message: "No chat room found."
                })
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error at get chat name",
                error: error
            });
        });
}, (request, response) => {
    let query = `SELECT M.chatid, M.message, 
                 to_char(M.Timestamp AT TIME ZONE 'PDT', 'YYYY-MM-DD HH24:MI:SS' ) AS Timestamp 
                 FROM Messages M 
                 JOIN (SELECT chatid, MAX(TimeStamp) latest_message FROM Messages GROUP BY chatid) C 
                 ON M.chatid=C.chatid AND M.TimeStamp=C.latest_message 
                 WHERE M.chatid in (SELECT chatid FROM chatmembers WHERE memberid = $1) ORDER BY M.chatid
                 `;
    let values = [request.decoded.memberid];
        
    pool.query(query, values)
        .then(result => {
            response.status(200).send({
                success: true, 
                message: "Previews successfully obtained. ", 
                name: request.rooms, 
                previews: result.rows
            })
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error at get preview",
                error: error
            })
        })
})

module.exports = router