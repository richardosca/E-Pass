/**
 * This file is big because all request handlers are kept here
 * The database connection pool object is also initialized in the scope of this file
 */

/**
 * The main request handler
 * This routes all requests to their specific handler method
 * This reduces code from index.js(The main code file), and organises the code
 */
const fs = require('fs');
const path = require('path');
/**
 * Parses the incomming request bodies into javascript objects so that we can work with them
 */
var bodyParser = require('body-parser');

//DATABASE I/O
//pool -> this will be used to make database connection and querries
const {
    pool,
    dbEmailExists, 
    dbRegisterUser,
    dbGetUserRole, 
    dbRegiserOrganisation,
    dbGetUserOrganisationId,
    dbGetUserData,
    dbGetOrganisationName
} = require('./db');


/**
 * For hashing strings
 */
const {hashString} = require('./hash_util');

/**
 * we'll need to assign JWTs to users who sign in
 */
const jwt = require('jsonwebtoken');
//importing middlewares for each user role routes
const {authSecret, jwtAlgorithm, jwtHeaderKey, admin, management, security, visitor, homeRouter} = require('./auth');
/**
 * This wil parse incomming request cookie strings into javascript objects
 */
const cookieParser = require('cookie-parser');


//SANITIZING MIDDLEWARES
/**
 * 
 */
const {
    signUpValidate,
    signUpOrgValidate,
    loginValidate
} = require('./validator');


const {validationResult} = require('express-validator');

const { UserRoleTypes } = require('./models');
const { managementRouter } = require('./routes/managementRouter');
const { visitorRouter } = require('./routes/visitorRouter');
const { securityRouter } = require('./routes/securityRouter');

/**
 * 
 * @param {Express} app 
 * @returns User
 */
const Handler = (app) =>{
    //INITIALIZATION
    /*
    bodyParser assists in parsing incoming HTTP JSON requests
    some HTTP requests contain a JSON body
    */
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended:true
    }))
    app.use(cookieParser());
    
    //INITIALIZING ROUTERS
    
    //SIGN UP
    //sign up page
    const signUpOrgPage = fs.readFileSync('./public/sign_up_org.html').toString();
    const signUpPage = fs.readFileSync('./public/sign_up.html').toString();
    app.get('/sign_up', (req, res)=>{
        res.send(signUpPage);
    })
    app.get('/sign_up_org', (req, res)=>{
        res.send(signUpOrgPage);
    })
    //sign up submission
    async function registerPersonal(req, res){
        try{
            console.log("User Registration");
            const {first_name, last_name, email, password, confirm_password} = req.body;
            console.log('first_name', first_name)
            console.log('last_name',last_name)
            console.log('email',email)
            console.log('password',password)
            console.log('confirm_password',confirm_password)
            const checkEmail = await dbEmailExists(pool, email);
            
            if(checkEmail === true){
                throw 'email address already in use';
            }
            if(password !== confirm_password){
                throw 'password mismatch';
            }
            const hashed_password = hashString(password).toString();
            await dbRegisterUser(pool, first_name, last_name, email, hashed_password);
            res.redirect('/login');
            
        }catch(err){
            console.error(err);
            res.status(400).send(err);
        }
    }
    app.post('/sign_up', signUpValidate, (req, res)=>{
        //check if the request did not succeed sanitization check
        const validation = validationResult(req);
        const errorCount = validation.errors.length;
        if(errorCount > 0){
            res.status(400).send('invalid credentials');
            return;
        }
        registerPersonal(req, res);
    })
    async function registerOrganisation(req, res){
        try {
                const {organisation_name,
                    user_first_name,
                    user_last_name,
                    user_email,
                    password,
                    confirm_password} = req.body;
            const email_exists = await dbEmailExists(pool, user_email);
            
            if(email_exists === true){
                throw new Error('Email already exists');
            }
            if(password !== confirm_password){
                throw new Error('Passwords do not match')
            }
            const hashed_password = hashString(password).toString();
            const registrationSuccess = await dbRegiserOrganisation(pool, organisation_name, user_first_name,
                                user_last_name, user_email, hashed_password);
            
            if(registrationSuccess === true){
                res.status(200).send('success');
                return;
            }
            res.status(500).send('internal server error');
        } catch (error) {
            console.error(error);
            res.status(400).send();
        }
        
    }
    app.post('/sign_up_org', signUpOrgValidate, (req, res)=>{
        //check if the request did not succeed sanitization check
        const validation = validationResult(req);
        const errorCount = validation.errors.length;
        
        if(errorCount > 0){
            console.error(validation.errors)
            res.status(400).send('invalid credentials');
            return;
        }
        registerOrganisation(req, res);
    })

    //USER LOGIN
    async function userLogin(req, res){
        try{
            const email = req.body.email;
            const password = req.body.password;

            const hashed_password = hashString(password).toString();
            const result = await pool.query("select id, email, hashed_password from users where email = $1 and hashed_password = $2;",
            [email, hashed_password]);
            // console.log("\nlogin pool result\n"+result.rows[0]+"\n\n");
            if(result.rows[0] === undefined || null){
                throw new Error();
            }
            const user = {
                first_name:'',
                last_name:'',
                user_id: result.rows[0].id,
                user_role: "",
                organisation_id:-1,
                organisation_name:'',
                gate_id:-1
            }
            //get this user's role
            user.user_role = await dbGetUserRole(pool, user.user_id);
            

            //set user's organisation
            if(user.user_role === UserRoleTypes.MANAGEMENT || user.user_role === UserRoleTypes.SECURITY){
                user.organisation_id = await dbGetUserOrganisationId(pool, user.user_id);
            }
            
            const user_data = await dbGetUserData(pool, user.user_id);
            user.first_name = user_data.first_name;
            user.last_name = user_data.last_name;
            const organisation_name = await dbGetOrganisationName(pool, user.organisation_id);
            user.organisation_name = organisation_name;
            //sign an auth token for this user
            //12 hour session before user token expires
            const sessionDuration = 12 * 60 * 60 * 1000;
            const token = jwt.sign({user}, authSecret, {
                algorithm: jwtAlgorithm,
                expiresIn: sessionDuration
            });
            
            
            res.status(200).cookie(jwtHeaderKey, token, {maxAge:sessionDuration}).send(user);
            
        }catch(e){
            console.error(e);
            res.status(401).send('invalid login');
        }
    }
    //  login page
    app.get('/login', (req, res)=>{
        const loginPage = fs.readFileSync(path.join(__dirname, './public/login.html')).toString();
        res.send(loginPage);
    });
    //  login request
    app.post('/login', loginValidate, (req, res)=>{
        //sanitize the incoming data
        const validation = validationResult(req);
        const errorCount = validation.errors.length;
        
        if(errorCount > 0){
            res.status(400).send('invalid credentials');
            return;
        }
        userLogin(req, res);
    });
    //logout
    app.get('/logout', (req, res)=>{
        res.clearCookie(jwtHeaderKey).redirect('/login');
    })


    //MANAGEMENT ROUTES
    app.use(managementRouter);
    
    //SECURITY ROUTES
    app.use(securityRouter);

    //VISITOR ROUTES
    app.use(visitorRouter);

    //FOR ACCESS DENIED
    const accessDeniedPage = fs.readFileSync(path.join(__dirname, '/pages/forbidden.html')).toString();
    app.get('/forbidden', (req, res)=>{
        res.status(403).send(accessDeniedPage);
    })


    //SITE HOME ->redirects users to their home page, based on whether they are logged in
    //or their user role
    const defaultHomePage = fs.readFileSync(path.join(__dirname, './pages/index.html')).toString();
    app.get('/', homeRouter, (req, res)=>{
        res.send(defaultHomePage);
    })

}



module.exports = {Handler};
