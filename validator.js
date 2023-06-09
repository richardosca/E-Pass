const {check, validationResult} = require('express-validator');


/**
 * This is a middleware that is used to sanitize incoming POST requests
 */
const loginValidate = [
    // Check Username
    check('email', 'Username Must Be an Email Address').isEmail().trim().escape().normalizeEmail(),
    // Check Password
    check('password').isLength({ min: 8 }).withMessage('Password Must Be at Least 8 Characters').trim().escape()];
//middlware for /sign_up POST request 
const signUpValidate = [
    //first name
    check('first_name').trim().escape(),
    //last name
    check('last_name').trim().escape(),
    //email
    check('email', 'You must use a valid email address').isEmail().trim().escape().normalizeEmail(),
    //password
    check('password').isLength({ min: 8 }).withMessage('Password Must Be at Least 8 Characters').trim().escape(),
    //confirm password
    check('confirm_password').isLength({ min: 8 }).withMessage('Password Must Be at Least 8 Characters').trim().escape()
]
//middleware for /sign_up_org POST requests (organisation sign up)
const signUpOrgValidate = [
    check('organisation_name').isLength({min:3}).withMessage('Organisation name not long(3+ letters) enough').trim().escape(),
    check('user_first_name').trim().escape(),
    check('user_last_name').trim().escape(),
    check('user_email', 'You must use a valid email address').isEmail().trim().escape().normalizeEmail(),
    check('password').isLength({ min: 8 }).withMessage('Password Must Be at Least 8 Characters').trim().escape(),
    //confirm password
    check('confirm_password').isLength({ min: 8 }).withMessage('Password Must Be at Least 8 Characters').trim().escape()
]

const emailValidate = [
    check('email').trim().escape(),
]

const gateValidate = [  
    check('gate_name').isLength({max:30,min:1}).withMessage('Gate name must have 1-30 letters').trim().escape(),
    check('gate_description').isLength({max:255,min:0}).trim().escape()
]

const grantPassValidate =[
    check('invited_user_id').isNumeric().withMessage('invited user id must be a number').escape(),
    check('gate_id').isNumeric().withMessage('gate id must be a number').escape(),
    check('_date').isDate({format:'YYYY-MM-DD'}).withMessage('date must be a valid date').trim().escape()
]

/**
 * Email search is different from email since not the entire email address is sent.
 * When a user begins typing an email, immediately the input characters surpass a size of 3,
 *      the characters are sent to the server to check for a matching email.
 * emailValidate is different. It is used with full emails, it therefore requires the character '@'
 */
const emailSearch = [
    check('email').trim().escape()
]

/**
 * For entry 
 */
const processEntry=[
    check('vehicle_registration').trim().isLength({min:0,max:13}).escape(),
    check('luggage_description').trim().isLength({min:0,max:255})
]

/**
 * @param {Number} value
 * @return {boolean}
 */
const isNumber = (value)=> {
    return typeof value === 'number' && isFinite(value);
}

const areNumbers = async(array)=>{
    try{
        for(let i = 0; i < array.length; i++){
            if(isNumber(array[i]) !== true){
                return false;
            }
        }
        return true;
    }catch{
        return false;
    }
}

module.exports = {
    isNumber,
    areNumbers,
    processEntry,
    emailSearch,
    loginValidate,
    signUpOrgValidate,
    signUpValidate,
    emailValidate,
    gateValidate,
    grantPassValidate
}