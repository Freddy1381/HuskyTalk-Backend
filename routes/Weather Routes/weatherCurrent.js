const express = require("express");
const https = require('https');
const router = express.Router();

const validation = require("../../utilities").validation;
let isStringProvided = validation.isStringProvided;

const API_KEY = "8d07e95605a14de19ca172142231105";
let location;
const API_URL = `https://api.weatherapi.com/v1/current.json?key=${API_KEY}`;


router.get(
    "/",
    (request, response, next) => {
        if(isStringProvided(request.body.location)) {
            next();
        } else {
            response.status(400).send({
                error: "No location attached."
            });
        }
    },
    (request, response) => {
        location = request.body.location;
        let weatherInfo;
        let reqURL = `${API_URL}` + `&q=` + `${location}` + `&aqi=no`;
        //let reqURL = "https://api.weatherapi.com/v1/current.json?key=8d07e95605a14de19ca172142231105&q=98391&aqi=no";

        https.get(`${reqURL}`, (resp) => {
        let data = '';

        // A chunk of data has been received.
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            console.log(data);
            console.log(JSON.parse(data).explanation);
        });

        }).on("error", (err) => {
        console.log("Error: " + err.message);
        });

        response.status(200).send({
            success: "Good to go.",
            location: `${location}`,
            calledURL: `${reqURL}`
        });
    }
);

module.exports = router;