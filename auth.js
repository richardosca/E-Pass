const { UserRoleTypes } = require('./models');

/**
 * Json Web Token
 * JWTs are used to validate users
*/
const jwt = require('jsonwebtoken');

/**
 * this will be the name of our JWTs
 * when a client successfully logs in, we give them a token with this name, then we'll check for it
 *  after each request
*/
const jwtHeaderKey = 'auth_header';

/*
    This random string is our secret. We use it to generate json web tokens that we'll use to authenticate users
*/
const authSecret = 'SMmYVb8b8XQhVJmJQde7SDgdhnztxifzrsioOQtY2s5vhbyYJ8GA6n9sXrZ2Ew3zluUkxjkiLKbAC';
/*
  This is the algorith we'll use on out JOSN Web Tokens
*/
const jwtAlgorithm = "HS256";

/**
 * This secures all admin routes
 */
function admin(req, res, next){
  try {
    const token = req.cookies[jwtHeaderKey];
    
    const decodedToken = jwt.verify(token, authSecret);
    const user = decodedToken.user;
    
    if (user.user_role !== UserRoleTypes.ADMIN) {
      throw 'Invalid user ID';
    }
    else {
      next();
    }
  }
  catch {
    res.redirect('/login');
  }
}
/**
 * This secures management routes
 * 
 * Check user_role, user_id and user_organisation
 */
function management(req, res, next){
  try {
    const token = req.cookies[jwtHeaderKey];
    
    const decodedToken = jwt.verify(token, authSecret);
    const user = decodedToken.user;
    req.body.organisation_id = decodedToken.user.organisation_id;
    req.body.user_id = decodedToken.user.user_id;
    
    if (req.body.userId && req.body.userId !== user.user_id
        || user.user_role !== UserRoleTypes.MANAGEMENT) {
      throw 'Invalid user ID';
    }
    else {
      next();
    }
  }
  catch {
    res.redirect('/forbidden');
  }
}
/**
 * This secures management routes
 * 
 * Check user_role, user_id, user_organisation and gate_id
 */
function security(req, res, next){
  try {
    const token = req.cookies[jwtHeaderKey];
    
    const decodedToken = jwt.verify(token, authSecret);
    const user = decodedToken.user;

    req.body.organisation_id = decodedToken.user.organisation_id;
    req.body.user_id = decodedToken.user.user_id;
    
    if (req.body.userId && req.body.userId !== user.user_id
        && user.user_role === UserRoleTypes.SECURITY) {
      throw 'Invalid user ID';
    }
    else {
      next();
    }
  }
  catch {
    res.redirect('/login');
  }
}

const getTokenUserName = (req, res)=>{
  try {
    const token = req.cookies[jwtHeaderKey];
    
    const decodedToken = jwt.verify(token, authSecret);
    const first_name = decodedToken.user.first_name;
    const last_name = decodedToken.user.last_name;
    return first_name + ' ' + last_name;
  }
  catch {
    res.redirect('/login');
    return '';
  }
}

/**
 * This secures visitor routes
 * 
 * check user_id and user_role
 */
function visitor(req, res, next){
  try {
    const token = req.cookies[jwtHeaderKey];
    
    const decodedToken = jwt.verify(token, authSecret);
    const user = decodedToken.user;
    
    if (req.body.userId && req.body.userId !== user.user_id
        && user.user_role === UserRoleTypes.VISITOR) {
      throw 'Invalid user ID';
    }
    else {
      next();
    }
  }
  catch {
    res.redirect('/login');
  }
}

function homeRouter(req, res, next){
  try {
    const token = req.cookies[jwtHeaderKey];
    
    const decodedToken = jwt.verify(token, authSecret);
    const user = decodedToken.user;
    
    if (req.body.userId && req.body.userId !== user.user_id
        && user.user_role === UserRoleTypes.VISITOR) {
      throw 'Invalid user ID';
    }
    else {
      switch(user.user_role){
        case UserRoleTypes.ADMIN:
          res.redirect('/admin');
          return;
        case UserRoleTypes.MANAGEMENT:
          res.redirect('/management');
          return;
        case UserRoleTypes.SECURITY:
          res.redirect('/security');
          return;
        default:
          res.redirect('/visitor');
          return;
      }
    }
  }
  catch {
    next();
  }
}

module.exports = {
    admin,
    getTokenUserName,
    management,
    security,
    visitor,
    homeRouter,
    authSecret,
    jwtHeaderKey,
    jwtAlgorithm
};