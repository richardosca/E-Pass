/**
 * All functions in this module have the prefix db. This sets the difference between
 * database functions and other functions.
 */


/**
 * This module is used to establish and coordinate communication between the database (Postgres)
 * and the server app.
 * For that, we import the Pool module from the pg package.
*/
const Pool = require('pg').Pool;

const {hashString} = require('./hash_util');
const { UserRoleTypes } = require('./models');

/**
 * A Pool is used to establish and coordinate communication with the database
 * over a TCP connection. (a TCP connection to localhost:5432)
 * The database will be running in this machine, so the host address will be localhost
*/
const pool = new Pool({
    user:'postgres',
    host:'localhost',//host address
    database:'e_entry_system',
    password:'postpass',
    port:5432
})

/**
 * 
 * @param {Pool} _pool 
 * @param {String} email 
 * @return {Boolean} success:Boolean
 */
const dbEmailExists = async(_pool, email)=>{
    const res = await _pool.query("select id from users where email = $1",[email]);
    if(res.rowCount > 0){
        return true
    }
    return false
}

/**
 * 
 * @param {Pool} _pool 
 * @param {String} first_name 
 * @param {String} last_name 
 * @param {String} email 
 * @param {String} hashed_password 
 */
const dbRegisterUser = async (_pool, first_name, last_name, email, hashed_password)=>{
    try{
        const res = await _pool.query(`insert into users(first_name,
                                                     last_name,
                                                     email,
                                                     hashed_password) 
                                        values( $1, $2, $3, $4 )`, [first_name, last_name, email, hashed_password]);    
    }catch(error){
        console.error(error);
    }
    
}

/**
 * 
 * @param {Pool} _pool 
 * @param {String} first_name 
 * @param {String} last_name 
 * @param {String} email 
 * @param {String} hashed_password 
 */
const dbRegisterOrgUser = async(_pool, first_name, last_name, email, organisation_id, hashed_password, user_role)=>{
    try{
        //register user
        const user_res = await _pool.query(`insert into users(first_name, last_name, email, hashed_password)
                                      values( $1, $2, $3, $4 ) returning id`,
                                     [first_name, last_name, email, hashed_password]);
        const user_id = user_res.rows[0].id;

        //set user's role
        const role_res = await _pool.query(`insert into user_roles(user_id, user_role) values( $1, $2 )`,
                                            [user_id, user_role]);
        
        //link user to organisation in organisation_members
        const om_res = await _pool.query(`insert into organisation_members(user_id, organisation_id) 
                                            values( $1, $2 )`, [user_id, organisation_id]);
        
        return true;
    }catch{
        return false;
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} user_id 
 * @return {String}
 */
const dbGetUserRole = async(_pool, user_id)=>{
    const res = await _pool.query("select user_role from user_roles where user_id = $1", [user_id]);
    try{
        return res.rows[0].user_role;
    }catch{
        return UserRoleTypes.VISITOR;
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {String} organisation_name 
 * @param {String} user_first_name 
 * @param {String} user_last_name 
 * @param {String} user_email 
 * @param {String} user_hashed_password 
 * 
 * @return {Boolean}
 */
const dbRegiserOrganisation = async(_pool,
                                  organisation_name,
                                  user_first_name,
                                  user_last_name,
                                  user_email,
                                  user_hashed_password)=>{
    try{
        //register user
        const user_res = await _pool.query(`insert into users(first_name, last_name, email, hashed_password)
                                      values( $1, $2, $3, $4 ) returning id`,
                                     [user_first_name, user_last_name, user_email, user_hashed_password]);
        const user_id = user_res.rows[0].id;
        
        //register organisation
        const org_res = await _pool.query(`insert into organisations(name) values($1) returning id`, [organisation_name]);
        const organisation_id = org_res.rows[0].id;

        //set user's role as MANAGEMENT
        const role_res = await _pool.query(`insert into user_roles(user_id, user_role) values( $1, $2 )`,
                                            [user_id, UserRoleTypes.MANAGEMENT]);
        //link user to organisation in organisation_members
        const om_res = await _pool.query(`insert into organisation_members(user_id, organisation_id) 
                                            values( $1, $2 )`, [user_id, organisation_id]);
        
        return true;
    }catch{
        console.error('db: cannot add organisation account');
        return false;
    }
    
}

/**
 * If an error occurs this function will return -1
 * @param {Pool} _pool 
 * @param {Number} user_id
 * @return {Number}
 */
const dbGetUserOrganisationId = async(_pool, user_id)=>{
    try{
        const result = await _pool.query("select organisation_id from organisation_members where user_id = $1",
        [user_id]);
        return result.rows[0].organisation_id;
    }catch{
        return -1;
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {String} email
 */
const dbSearchUserByEmail = async(_pool , email)=>{
    try{
        const result = await _pool.query(`select id,first_name, last_name, email from 
            users where email ilike '%${email.toString()}%' limit 2`);
        return result.rows;
    }catch(err){
        return [];
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} id 
 * @returns 
 */
const dbGetUserData = async(_pool, id)=>{
    try{
        const res = await _pool.query("select first_name, last_name, email from users where id = $1", [id]);
        return res.rows[0];
    }catch(err){
        return null;
    }
}

const dbGetUserEmail = async(_pool, id)=>{
    try{
        const res = await _pool.query('select email from users where id = $1', [id]);
        return res.rows[0].email;
    }catch{
        return '';
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} org_id 
 * @returns 
 */
const dbGetOrganisationName = async(_pool, org_id)=>{
    try{
        const res = await _pool.query("select name from organisations where id = $1", [org_id]);
        return res.rows[0].name;
    }catch(err){
        console.log(err);
        return 'err';
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {String} gate_name Max 30
 * @param {String} gate_description Max 255
 * @param {Number} org_id Organisation Id
 * @return {boolean} Success
 */
const dbAddGate = async(_pool, gate_name, gate_description, org_id)=>{
    try{
        const res = await _pool.query('insert into gates(name, description, organisation_id)'
        +'values( $1, $2, $3 )',[gate_name, gate_description, org_id]);
        return true;
    }catch{
        return false;
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} organisation_id 
 */
const dbGetOrganisationGates = async(_pool, organisation_id)=>{
    try{
        const res = await _pool.query("select * from gates where organisation_id = $1",[organisation_id]);
        const out = res.rows;
        return out;
    }catch{
        return {err:'database error'};
    }
}

/**
 * @param {Pool} _pool 
 * @param {Number | undefined} gate_id 
 * @param {String | undefined} name 
 * @param {String | undefined} description 
 * @return {Boolean} Success
 */
const dbEditGate = async(_pool, gate_id, name, description)=>{
    const success = true;
    
    try{
        if(name !== undefined){
            const res = await _pool.query("update gates set name "
                +"= $1 where id = $2", [name, gate_id]);
        }
    }catch(err){
        console.log('failed');
        success = false;
    }
    try{
        if(description !== undefined){
            const res = await _pool.query("update gates set description"
                +" = $1 where id = $2", [description, gate_id]);
        }
    }catch{
        success = false;
    }
    
    return success;
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} gate_id 
 * @return {{organisation_id} | undefined}
 */
const dbGetGateOrganisationId = async(_pool, gate_id)=>{
    try{
        const res = await _pool.query("select organisation_id from"
            +" gates where id = $1", [gate_id]);
        const out = res.rows[0].organisation_id;
        return out;
    }catch(err){
        return new Error('cannot fetch organisation id of this gate');
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} user_id 
 * @param {Number} invited_user_id 
 * @param {Number} gate_id 
 * @param {String} _date 
 * @return {Bool} Success
 */
const dbGrantPass = async(_pool, user_id, invited_user_id, gate_id, _date,
                organisation_id, inviting_user_name, invited_user_email)=>{
    try{
        const res = await _pool.query("insert into passes(inviting_user_id,"
        +"invited_user_id, gate_id, _date, organisation_id, inviting_user_name, invited_user_email)"
        +"values( $1, $2, $3, $4, $5, $6, $7 )",
        [user_id, invited_user_id, gate_id, _date, organisation_id, inviting_user_name, invited_user_email]);
        return true;
    }catch(err){
        console.log(err);
        return false;
    }
}

const dbUserExists = async(_pool, user_id)=>{
    try{
        const res = await _pool.query("select id from users where id = $1", [user_id]);
        if(res.rows.length === 0){
            return false;
        }
        return true;
    }catch{
        return false;
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} organisation_id 
 */
const dbGetOrganisationPasses = async(_pool, organisation_id)=>{
    try{
        const res = await _pool.query('select * from passes'+
            ' where organisation_id = $1 order by _date asc', [organisation_id]);
        
        return res.rows;
    }catch{
        
        return undefined;
    }
}

const dbGetGateName = async(_pool, gate_id)=>{
    try{
        const res = await _pool.query('select name from gates where id = $1', [gate_id]);
        return res.rows[0].name;
    }catch(err){
        console.log(err);
        return new Error('db: unable to get gate name')
    }
}

/**
 * Returns the ids of this organisation's user accounts
 * @param {Pool} _pool 
 * @param {Number} organisation_id 
 */
const dbGetOrgUserIds = async(_pool, organisation_id)=>{
    try{
        const res = await _pool.query(`select user_id from organisation_members`
            +` where organisation_id = $1`, [organisation_id]);
        return res.rows;
    }catch(err){
        return new Error();
    }
}

const dbDeletePass = async(_pool, pass_id)=>{
    try{
        await _pool.query('delete from passes where id = $1', [pass_id]);
    }catch(err){
        return new Error(err);
    }
}

/**
 * @param {Pool} _pool 
 * @param {Number} user_id 
 */
const dbGetVisitorPasses = async(_pool, user_id)=>{
    try{
        const res = await _pool.query("select _date, inviting_user_id, gate_id, organisation_id,"
            +" inviting_user_name from passes where invited_user_id = $1", [user_id]);
        return res.rows;
    }catch(err){
        console.log(err);
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} organisation_id 
 */
const dbGetGateOfficersData = async(_pool, organisation_id)=>{
    try{
        const res = await _pool.query('select id, name, description, officer_id from gates where'
            +' organisation_id = $1', [organisation_id]);
        return res.rows;
    }catch(err){
        console.error(err);
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} user_id 
 * @return {Boolean} Success
 */
const dbIsSecurityOfficer = async(_pool, user_id)=>{
    try{
        const res = await _pool.query("select user_id from user_roles where user_id = $1 and"
        +" user_role = 'SECURITY'" , [user_id]);
        if(res.rows.length > 0){
            return true;
        }
        return false
    }catch(err){
        console.error(err);
        return false;
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} gate_id 
 * @param {Number} officer_id 
 */
const dbSetGateOfficer = async(_pool, gate_id, officer_id)=>{
    try{
        await _pool.query('update gates set officer_id = $1 where id = $2', [officer_id, gate_id]);
    }catch(err){
        return new Error(err);
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} officer_id 
 * @returns 
 */
const dbGetOfficerGates = async(_pool, officer_id)=>{
    try{
        const res = await _pool.query('select id, name from gates where officer_id = $1', [officer_id]);
        return res.rows;
    }catch(err){
        console.error(err);
        return new Error(err);
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} pass_id 
 * @returns 
 */
const dbGetPassInfo = async(_pool, pass_id)=>{
    try{
        const res = await _pool.query('select inviting_user_id, gate_id, invited_user_id from passes where id = $1',
        [pass_id]);
        return res.rows[0];
    }catch(err){
        return new Error(err);
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} gate_id 
 * @param {String} email 
 */
const dbSearchTodaysPasses = async(_pool, gate_id, email)=>{
    try{
        const today = new Date().toJSON().slice(0, 10);
        const results = await _pool.query(`select id, inviting_user_name, invited_user_email`
            +` from passes`
            +` where gate_id = $1 and invited_user_email ilike '%${email.toString()}%'`
            + ` and _date = $2 limit 5`, [gate_id, today]);
        return results.rows;
    }catch(err){
        return new Error(err);
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} visitor_id 
 * @param {Number} authorizing_officer_id 
 * @param {String} vehicle_registration 
 * @param {String} luggage_description 
 * @param {Date.toJSON} time_in 
 * @param {Number} inviting_user_id 
 * @param {Number} organisation_id 
 * @param {Number} gate_id
 */
const dbAddGateRecord = async(_pool,
    visitor_id,
    authorizing_officer_id,
    vehicle_registration,
    luggage_description,
    time_in,
    inviting_user_id,
    organisation_id,
    gate_id
    )=>{
        try{
            const res = await _pool.query('insert into gate_records(visitor_id, authorizing_officer_id,'
            + ' vehicle_registration, luggage_description, time_in, inviting_user, organisation_id, gate_id)'
            + ' values($1, $2, $3, $4, $5, $6, $7, $8)',
            [visitor_id, authorizing_officer_id, vehicle_registration, luggage_description,
            time_in, inviting_user_id, organisation_id, gate_id]);
            return res;
        }catch(err){
            return new Error(err);
        }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} visitor_id 
 * @param {Number} organisation_id 
 */
const dbSearchPendingExit = async(_pool, visitor_id, organisation_id)=>{
    try{
        const res = await _pool.query('select id, visitor_id, luggage_description, vehicle_registration'
        +   ' from gate_records where organisation_id'
        +   ' = $1 and visitor_id = $2 and time_out is null', [organisation_id, visitor_id]);
        return res.rows[0];
    }catch(err){
        return new Error(err);
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} gate_record_id 
 */
const dbProcessExit = async(_pool, gate_record_id, time_out)=>{
    try{
        await _pool.query('update gate_records set time_out = $1 where id = $2', [time_out, gate_record_id]);
    }catch(err){
        throw new Error(err);
    }
}

/**
 * 
 * @param {Pool} _pool 
 * @param {Number} organisation_id 
 */
const dbGetGateRecords = async(_pool, organisation_id)=>{
    try{
        const res = await _pool.query('select id, visitor_id, inviting_user, gate_id, authorizing_officer_id, vehicle_registration,'
        +   ' luggage_description, time_in, time_out from gate_records where organisation_id = $1', [organisation_id]);
        return res.rows;
    }catch(err){
        throw new Error(err);
    }
}

module.exports =  {
    pool,
    dbGetGateRecords,
    dbProcessExit,
    dbSearchPendingExit,
    dbGetPassInfo,
    dbAddGateRecord,
    dbSearchTodaysPasses,
    dbGetOfficerGates,
    dbSetGateOfficer,
    dbIsSecurityOfficer,
    dbGetGateOfficersData,
    dbGetVisitorPasses,
    dbDeletePass,
    dbGetOrgUserIds,
    dbGetGateName,
    dbGetUserEmail,
    dbGetOrganisationPasses,
    dbUserExists,
    dbGrantPass,
    dbGetGateOrganisationId,
    dbEmailExists,
    dbRegisterUser,
    dbGetUserRole,
    dbRegiserOrganisation,
    dbGetUserOrganisationId,
    dbRegisterOrgUser,
    dbSearchUserByEmail,
    dbGetUserData,
    dbGetOrganisationName,
    dbAddGate,
    dbGetOrganisationGates,
    dbEditGate
};



//implement rollback on failed pool querries
