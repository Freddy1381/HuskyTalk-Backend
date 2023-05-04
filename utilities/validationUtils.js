// const { param } = require("../routes/register.js")

/**
 * Checks the parameter to see if it is a a String with a length greater than 0.
 * 
 * @param {string} param the value to check
 * @returns true if the parameter is a String with a length greater than 0, false otherwise
 */
let isStringProvided = (param) => 
    param !== undefined && param.length > 0


// Feel free to add your own validations functions!
// for example: isNumericProvided, isValidPassword, isValidEmail, etc
// don't forget to export any 

let containsNumericPassword = (param) => 
    /\d/.test(param)

let containsMixCasePassword = (param) => 
    /[a-z]/.test(param) && /[A-Z]/.test(param)

let containsSpecialPassword = (param) => 
    /[^a-zA-Z\d]/.test(param)

let isLengthPassword = (param) => 
    param.length > 8


  
module.exports = { 
  isStringProvided, 
  containsNumericPassword, 
  containsMixCasePassword, 
  containsSpecialPassword, 
  isLengthPassword
}