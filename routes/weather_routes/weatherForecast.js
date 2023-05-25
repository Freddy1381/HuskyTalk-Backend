const config = require("../../config.js");

const express = require("express");
const router = express.Router();

const validation = require("../../utilities/exports.js").validation;
let isStringProvided = validation.isStringProvided;

API_KEY = config.WEATHER_API_KEY;
let location;
const API_URL = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}`;


router.post(
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
        let reqURL = `${API_URL}` + `&q=` + `${location}` + `&days=7&sqi=no&alerts=no`;

        

        fetch(`${reqURL}`).then(async result => {
            const weatherData = await result.json();
            console.log('response data', weatherData);
            response.status(200).send(fillJSON(weatherData));
        }).catch(err => {
            console.log('response data', err);
            response.status(400).send({
                message: 'Weather service temporarily unavailable.'
            })
        });



        
    }
);

function fillJSON(x) {
    //Framework of JSON object we'll be returning with response
    let weatherJSON = {
        current: {},
        hourly: [],
        daily: [],
    };
    //grab current location name, temp, and condition
    weatherJSON.current.cityName = x.location.name;
    weatherJSON.current.currTemp = x.current.temp_c;
    weatherJSON.current.currCon = x.current.condition.text;

    //fill JSON property array for 24 hour forecast for current day
    for(let i = 0; i < 24; i++) {
        weatherJSON.hourly[i] = {hourTemp: x.forecast.forecastday[0].hour[i].temp_c,
                                 hourCon: x.forecast.forecastday[0].hour[i].condition.text}

    }
    //fill JSON property array for 7 day forecast past current day
    for(let i = 0; i < 7; i++) {
        weatherJSON.daily[i] = {day: x.forecast.forecastday[i + 1].date,
                                dayTemp: x.forecast.forecastday[i + 1].day.avgtemp_c,
                                dayCon: x.forecast.forecastday[i + 1].day.condition.text}
    }
    console.log(weatherJSON);


    return weatherJSON;
};

module.exports = router;
