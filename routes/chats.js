//express is the framework we're going to use to handle requests
const express = require('express');

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool;

const router = express.Router();

const validation = require('../utilities').validation;
let isStringProvided = validation.isStringProvided;

/**
 * @apiDefine JSONError
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */ 

/**
 * @api {post} /chats Request to add an individual chat and the two users
 * @apiName PostChats
 * @apiGroup Chats
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {String} email address
 * @apiParam {String} name chat name
 * 
 * @apiSuccess (Success 201) {boolean} success true when the name is inserted
 * @apiSuccess (Success 201) {Number} chatId the generated chatId
 * 
 * @apiError (400: Unknown user) {String} message "unknown email address"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiError (400: Unknown Chat ID) {String} message "invalid chat id"
 * 
 * @apiUse JSONError
 */ 
router.post("/", (request, response, next) => {
    if (!isStringProvided(request.body.email)) {
        response.status(400).send({
            message: "Missing required information"
        });
    } else {
        next();
    }
}, (request, response, next) => {
    //validate email exists AND convert it to the associated memberId
    //let query = 'SELECT MemberID, Username FROM Members WHERE Email IN (\''+request.body.email[0]+'\',\''+ request.body.email[1] +'\')';
    let query = `SELECT memberid FROM Members WHERE Email = $1`;
    let values = [request.body.email];
    pool.query(query, values)
        .then(result => {
            if (result.rowCount = 0) {
                response.status(404).send({
                    message: "email not found"
                });
            } else {
                request.memberid = result.rows[0].memberid
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error at email validation",
                error: error
            });
        })
}, (request, response, next) =>{
    let query = 'SELECT chatid FROM chatmembers CM GROUP BY chatid HAVING count(*) = 2 AND count(*) FILTER (WHERE CM.memberid = $1) = 1 AND count(*) FILTER (WHERE CM.memberid = $2) = 1';
    let values = [request.decoded.memberid, request.memberid];
    pool.query(query, values)
        .then(result => {
            if(result.rowCount != 0) {
                response.status(400).send({
                    message: "chat already exists"
                });
            } else {
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error at check chat already exist",
                error: error
            });
        });
}, (request, response) => {
    let chatId;
    let insert = `INSERT INTO Chats(Name)
                  VALUES ($1)
                  RETURNING ChatId`;
    let values = [request.body.name];
    pool.query(insert, values)
        .then(result => {
            chatId = result.rows[0].chatid;
            let query = 'SELECT MemberID, Username FROM Members WHERE Email IN ($1, $2)';
            let values = [request.decoded.email, request.body.email];
            pool.query(query, values)
                .then(result => {
                    let values = [chatId, result.rows[0].memberid ,chatId , result.rows[1].memberid];
                    let insert = `INSERT INTO ChatMembers(ChatId, MemberId)
                                  VALUES ($1, $2), ($3, $4)
                                  RETURNING *`;
                    pool.query(insert, values)
                        .then(result => {
                            let query = 'INSERT INTO Messages (ChatId, Message, MemberId) VALUES ($1, $2, $3)';
                            let values = [chatId, '', request.decoded.memberid]
                            pool.query(query, values)
                                .then(response.send({success: true,
                                                     chatID: chatId}))
                                .catch(err => {
                                    response.status(400).send({
                                        message:"SQL Error at insert into messages", 
                                        error: err
                                    });
                                });
                            
                        }).catch(err => {
                            response.status(400).send({
                                message: "SQL Error at insert into chatmembers",
                                error: err
                            });
                        })          
            }).catch(err => {
                response.status(400).send({
                    message: "SQL Error at select memberid and username",
                    error: err
                });
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error at insert into chats",
                error: err
                });
            })
});

/**
 * @api {put} /chats/:chatId? Request add a user to a chat
 * @apiName PutChats
 * @apiGroup Chats
 * 
 * @apiDescription Adds the user associated with the required JWT. 
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {Number} chatId the chat to add the user to
 * 
 * @apiSuccess {boolean} success true when the name is inserted
 * 
 * @apiError (404: Chat Not Found) {String} message "chatID not found"
 * @apiError (404: Email Not Found) {String} message "email not found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * @apiError (400: Duplicate Email) {String} message "user already joined"
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.put("/:chatId/", (request, response, next) => {
    //validate on empty parameters
    if (!request.params.chatId) {
        response.status(400).send({
            message: "Missing required information"
        });
    } else if (isNaN(request.params.chatId)) {
        response.status(400).send({
            message: "Malformed parameter. chatId must be a number. PUT /chatid got called"
        });
    } else {
        next();
    }
}, (request, response, next) => {
    //validate chat id exists
    let query = 'SELECT * FROM CHATS WHERE ChatId=$1';
    let values = [request.params.chatId];

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Chat ID not found"
                });
            } else {
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            });
        })
        //code here based on the results of the query
}, (request, response, next) => {
    //validate email exists 
    let query = 'SELECT * FROM Members WHERE MemberId=$1';
    let values = [request.decoded.memberid];

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "email not found"
                });
            } else {
                //user found
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            });
        })
}, (request, response, next) => {
        //validate email does not already exist in the chat
        let query = 'SELECT * FROM ChatMembers WHERE ChatId=$1 AND MemberId=$2';
        let values = [request.params.chatId, request.decoded.memberid];
    
        pool.query(query, values)
            .then(result => {
                if (result.rowCount > 0) {
                    response.status(400).send({
                        message: "user already joined"
                    });
                } else {
                    next();
                }
            }).catch(error => {
                response.status(400).send({
                    message: "SQL Error",
                    error: error
                });
            })

}, (request, response) => {
    //Insert the memberId into the chat
    let insert = `INSERT INTO ChatMembers(ChatId, MemberId)
                  VALUES ($1, $2)
                  RETURNING *`;
    let values = [request.params.chatId, request.decoded.memberid]
    pool.query(insert, values)
        .then(result => {
            response.send({
                success: true
            });
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            });
        })
});

/**
 * @api {get} /chats/:chatId? Request to get the emails of user in a chat
 * @apiName GetChats
 * @apiGroup Chats
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {Number} chatId the chat to look up. 
 * 
 * @apiSuccess {Number} rowCount the number of messages returned
 * @apiSuccess {Object[]} members List of members in the chat
 * @apiSuccess {String} messages.email The email for the member in the chat
 * 
 * @apiError (404: ChatId Not Found) {String} message "Chat ID Not Found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get("/:chatId", (request, response, next) => {
    //validate on missing or invalid (type) parameters
    if (!request.params.chatId) {
        response.status(400).send({
            message: "Missing required information"
        });
    } else if (isNaN(request.params.chatId)) {
        response.status(400).send({
            message: "Malformed parameter. chatId must be a number. /chatid got called"
        });
    } else {
        next();
    }
},  (request, response, next) => {
    //validate chat id exists
    let query = 'SELECT * FROM CHATS WHERE ChatId=$1';
    let values = [request.params.chatId];

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Chat ID not found"
                });
            } else {
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            });
        })
    }, (request, response) => {
        //Retrieve the members
        let query = `SELECT Members.Email 
                    FROM ChatMembers
                    INNER JOIN Members ON ChatMembers.MemberId=Members.MemberId
                    WHERE ChatId=$1`;
        let values = [request.params.chatId]
        pool.query(query, values)
            .then(result => {
                response.send({
                    rowCount : result.rowCount,
                    rows: result.rows
                });
            }).catch(err => {
                response.status(400).send({
                    message: "SQL Error",
                    error: err
                });
            })
});

/**
 * @api {delete} /chats/:chatId?/:email? Request delete a user from a chat
 * @apiName DeleteChats
 * @apiGroup Chats
 * 
 * @apiDescription Does not delete the user associated with the required JWT but 
 * instead deletes the user based on the email parameter.  
 * 
 * @apiParam {Number} chatId the chat to delete the user from
 * @apiParam {String} email the email of the user to delete
 * 
 * @apiSuccess {boolean} success true when the name is deleted
 * 
 * @apiError (404: Chat Not Found) {String} message "chatID not found"
 * @apiError (404: Email Not Found) {String} message "email not found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * @apiError (400: Duplicate Email) {String} message "user not in chat"
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.delete("/:chatId/:email", (request, response, next) => {
    //validate on empty parameters
    if (!request.params.chatId || !request.params.email) {
        response.status(400).send({
            message: "Missing required information"
        });
    } else if (isNaN(request.params.chatId)) {
        response.status(400).send({
            message: "Malformed parameter. chatId must be a number. chatid/email got called"
        });
    } else {
        next();
    }
}, (request, response, next) => {
    //validate chat id exists
    let query = 'SELECT * FROM CHATS WHERE ChatId=$1';
    let values = [request.params.chatId];

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Chat ID not found"
                });
            } else {
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            });
        })
}, (request, response, next) => {
    //validate email exists AND convert it to the associated memberId
    let query = 'SELECT MemberID FROM Members WHERE Email=$1';
    let values = [request.params.email];

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "email not found"
                });
            } else {
                request.params.email = result.rows[0].memberid
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            });
        })
}, (request, response, next) => {
        //validate email exists in the chat
        let query = 'SELECT * FROM ChatMembers WHERE ChatId=$1 AND MemberId=$2';
        let values = [request.params.chatId, request.params.email];
    
        pool.query(query, values)
            .then(result => {
                if (result.rowCount > 0) {
                    next();
                } else {
                    response.status(400).send({
                        message: "user not in chat"
                    });
                }
            }).catch(error => {
                response.status(400).send({
                    message: "SQL Error",
                    error: error
                });
            })

}, (request, response) => {
    //Delete the memberId from the chat
    let insert = `DELETE FROM ChatMembers
                  WHERE ChatId=$1
                  AND MemberId=$2
                  RETURNING *`;
    let values = [request.params.chatId, request.params.email];
    pool.query(insert, values)
        .then(result => {
            response.send({
                success: true
            });
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            });
        });
});

/**
 * @api {get} /chats/ Request to get the list of chats
 * @apiName GetChats
 * @apiGroup Chats
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiSuccess {Object[]} list of chats
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get('/',(request, response) => {
    let query = 'SELECT ChatId, Name FROM Chats';
    
    pool.query(query)
        .then(result => {
            response.status(200).send({
                success: true,
                chats: result.rows
            });
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            });
        });
});

/**
 * @api {delete} /chats/:chatId?/ Request delete a chat along with all the messages
 * @apiName DeleteChats
 * @apiGroup Chats
 * 
 * @apiDescription Deletes the messages and the associated chat.
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {Number} chatId the chat to delete
 * 
 * @apiSuccess {boolean} success true when the chat and messages are deleted
 * 
 * @apiError (404: Chat Not Found) {String} message "chatID not found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.delete("/:chatId", (request, response, next) => {
    //validate on empty parameters
    if (!request.params.chatId) {
        response.status(400).send({
            message: "Missing required information"
        });
    } else if (isNaN(request.params.chatId)) {
        response.status(400).send({
            message: "Malformed parameter. chatId must be a number"
        });
    } else {
        next();
    }
}, (request, response, next) => {
    //validate chat id exists
    let query = 'SELECT * FROM CHATS WHERE ChatId=$1';
    let values = [request.params.chatId];

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Chat ID not found"
                });
            } else {
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            });
        })
}, (request, response) => {
    //first delete data from tables that have chatid as foreign key constraint
    let query1 = 'DELETE FROM CHATS WHERE ChatId=$1';
    let query2 = 'DELETE FROM MESSAGES WHERE ChatId=$1';
    let query3 = 'DELETE FROM CHATMEMBERS WHERE ChatId=$1';
    let values = [request.params.chatId];

    pool.query(query2, values)
        .then(result => {
            pool.query(query3, values)
                .then(result => {
                    pool.query(query1, values)
                        .then(result => {
                            response.send({
                                success: true
                            });
                        }).catch(err => {
                            response.status(400).send({
                                message: "SQL Error",
                                error: err
                            });
                        })
                }).catch(err => {
                    response.status(400).send({
                        message: "SQL Error",
                        error: err
                    });
                })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            });
        })
});

/**
 * @api {delete} /chats/:chatId?/messages Request to clear chat of messages
 * @apiName DeleteChats
 * @apiGroup Chats
 * 
 * @apiDescription Deletes the messages of the specified chat.
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {Number} chatId the chat to delete the messages from
 * 
 * @apiSuccess {boolean} success true when the chat and messages are deleted
 * 
 * @apiError (404: Chat Not Found) {String} message "chatID not found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.delete("/:chatId/clear", (request, response, next) => {
    //validate on empty parameters
    if (!request.params.chatId) {
        response.status(400).send({
            message: "Missing required information"
        });
    } else if (isNaN(request.params.chatId)) {
        response.status(400).send({
            message: "Malformed parameter. chatId must be a number"
        });
    } else {
        next();
    }
}, (request, response, next) => {
    //validate chat id exists
    let query = 'SELECT * FROM CHATS WHERE ChatId=$1';
    let values = [request.params.chatId];

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Chat ID not found"
                });
            } else {
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            });
        })
}, (request, response) => {
    let query = 'DELETE FROM MESSAGES WHERE ChatId=$1';
    let values = [request.params.chatId];

    pool.query(query, values)
        .then(result => {
            response.send({
                success: true
            });
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            });
        })
});

/**
 * @apiDefine JSONError
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */ 

/**
 * @api {post} /chats/global Request to add a global chat and the two users
 * @apiName PostChats
 * @apiGroup Chats
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {String} email address array
 * 
 * @apiSuccess (Success 201) {boolean} success true when the name is inserted
 * @apiSuccess (Success 201) {Number} chatId the generated chatId
 * 
 * @apiError (400: Unknown user) {String} message "unknown email address"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiError (400: Unknown Chat ID) {String} message "invalid chat id"
 * 
 * @apiUse JSONError
 */ 
router.post("/global", (request, response, next) => {
    if (request.body.email.length == 0) {
        response.status(400).send({
            message: "Missing required information"
        });
    } else {
        next();
    }
}, (request, response, next) => {
    //validate email exists AND convert it to the associated memberId
    let query = 'SELECT MemberID, Username FROM Members WHERE Email IN (';
    let values = [];
    for(i = 0; i < request.body.email.length; i++) {
        if((i+1) == request.body.email.length){
            query += '$' + (i+1) + ')';
        } else {
            query += '$' + (i+1) + ',';
        }
        values.push(request.body.email[i])
    }
    pool.query(query, values)
        .then(result => {
            if (result.rowCount != request.body.email.length) {
                response.status(404).send({
                    message: "email not found"
                });
            } else {
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            });
        })
}, (request, response) => {
    let chatId;
    let insert = `INSERT INTO Chats(Name)
                  VALUES ($1)
                  RETURNING ChatId`;
    let values = ['Global Chat '];
    pool.query(insert, values)
        .then(result => {
            chatId = result.rows[0].chatid;
            let query = 'SELECT MemberID, Username FROM Members WHERE Email IN (';
            let values = [];
            for(i = 0; i < request.body.email.length; i++) {
                if((i+1) == request.body.email.length){
                    query += '$' + (i+1) + ')';
                } else {
                    query += '$' + (i+1) + ',';
                }
                values.push(request.body.email[i])
            }
            pool.query(query, values)
                .then(result => {
                    let query = 'INSERT INTO ChatMembers(ChatId, MemberId) VALUES ';
                    let values = [];
                    for(i = 0; i < result.rows.length; i++) {
                        if((i+1) == request.body.email.length){
                            query += '($' + (i*2+1) + ', $' + (i*2+2) +')';
                        } else {
                            query += '($' + (i*2+1) + ', $' + (i*2+2) +'), ';
                        }
                        values.push(chatId);
                        values.push(result.rows[i].memberid);
                    }

                    pool.query(query, values)
                        .then(result => {
                            let query = 'UPDATE Chats Set name = \'Global Chat '+ chatId+'\' WHERE chatid = '+chatId;
                            let values = [];
                            
                            pool.query(query, values)
                                .then(result => {
                                    response.send({
                                        success: true,
                                        chatID:chatId
                                    });
                                }).catch(err => {
                                    response.status(400).send({
                                        message: "SQL Error",
                                        error: err
                                    });
                                });
                        }).catch(err => {
                            response.status(400).send({
                                message: "SQL Error",
                                error: err
                            });
                        })          
            }).catch(err => {
                response.status(400).send({
                    message: "SQL Error",
                    error: err
                });
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
                });
            })
});

module.exports = router;