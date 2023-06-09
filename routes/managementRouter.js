const managementRouter = require('express').Router();
const fs = require('fs');
const path = require('path');
//restricts this page to users of MANAGEMENT role only
const {management} = require('../auth');

//for sanitizing incoming requests
const {
    gateValidate,
    grantPassValidate,
    emailValidate,
    signUpValidate,
    areNumbers,
    isNumber
} = require('../validator');
const {validationResult} = require('express-validator');

const {UserRoleTypes} = require('../models');
const {hashString} = require('../hash_util');

const {
    getTokenUserName
} = require('../auth');

//database interfacing functions
const {pool,
    dbAddGate,
    dbEditGate,
    dbEmailExists,
    dbGetGateName,
    dbGetGateOrganisationId,
    dbGetOrganisationGates,
    dbGetOrganisationPasses,
    dbGetUserEmail,
    dbGrantPass,
    dbRegisterOrgUser,
    dbSearchUserByEmail,
    dbUserExists,
    dbGetOrgUserIds,
    dbGetUserData,
    dbGetUserRole,
    dbDeletePass,
    dbGetGateOfficersData,
    dbIsSecurityOfficer,
    dbSetGateOfficer,
    dbGetGateRecords
} = require('../db');

const managementPage = fs.readFileSync(path.join(__dirname, '../pages/management.html')).toString();
managementRouter.get('/management', management, (req, res)=>{
    res.send(managementPage);
})
const gatesPage = fs.readFileSync(path.join(__dirname, '../pages/gates.html')).toString();
managementRouter.get('/management/gates', management, (req, res)=>{
    res.send(gatesPage);
})
const getOrganisationGates = async(req, res)=>{
    try{
        const organisation_id = req.body.organisation_id;
        if(organisation_id === -1){
            res.status(500).send('internal server error');
            return;
        }
        const gates = await dbGetOrganisationGates(pool, organisation_id);
        res.send(gates);
    }catch{
        res.status(500).send('internal server error');
    }
}
managementRouter.get('/management/gate-list', management, (req, res)=>{
    getOrganisationGates(req, res);
})
const addGate = async(req, res)=>{
    try{
        const {gate_name, gate_description} = req.body;
        const organisation_id = req.body.organisation_id;
        const success = await dbAddGate(pool, gate_name, gate_description, organisation_id);
        res.status(200).send('success');
    }catch{
        res.status(500).send('internal server error');
    }
}
//add gate
managementRouter.post('/management/add-gate', management, gateValidate, (req, res)=>{
    const validation = validationResult(req);
    const errorCount = validation.errors.length;

    if(errorCount > 0){
        res.status(400).send('invalid credentials');
        return;
    }
    addGate(req, res);
})
//edit gate
const editGate = async(req, res)=>{
    try{
        const {gate_id, edit_name, edit_description,
            new_gate_description, new_gate_name} = req.body;
            //ensure the gate is of this user's organisation
        const gate_organisation = await dbGetGateOrganisationId(pool, gate_id);
        const user_organisation = req.body.organisation_id;
        if(gate_organisation !== user_organisation){
            throw 'invalid request'
        }
        let gateName = undefined;
        let gateDescription = undefined;
        
        if(edit_name === true){
            gateName = new_gate_name;
        }
        if(edit_description === true){
            gateDescription = new_gate_description;
        }
        const success = await dbEditGate(pool, gate_id, gateName, gateDescription);
        if(success !== true){
            res.status(500).send('internal server error');
        }
        res.status(200).send('success');
    }catch{
        res.status(400).send('invalid request');
    }
}
managementRouter.put('/management/edit-gate', management, async(req, res)=>{
    const validate = validationResult(req);
    const errorCount = validate.errors.length;
    
    if(errorCount > 0){
        res.status(400).send('invalid credentials');
        return;
    }
    await editGate(req, res);
})
const addOrgUser = async(req, res)=>{
    try{
        const {first_name,
                last_name,
                email,
                user_role,
                password,
                confirm_password} = req.body;
        const organisation_id = req.body.organisation_id;
    
        if(dbEmailExists(pool,email) === true){
            res.status(400).send('email already exists');
            return;
        }

        //check user role
        switch(user_role){
            case UserRoleTypes.MANAGEMENT:
                break;
            case UserRoleTypes.SECURITY:
                break;
            default:
                res.status(400).send('');
                return;
        }

        const hashed_password = hashString(password);

        const reg_success = await dbRegisterOrgUser(pool, first_name, last_name,
            email, organisation_id, hashed_password, user_role);
    
    if(reg_success === true){
        res.status(200).send('success');
        return;
    }
    res.status(500).send('something went wrong😕');
    
    }catch(err){
        console.log(err);
        res.status(500).send('internal server error');
    }
}

const addAccountPage = fs.readFileSync(path.join(__dirname, '../pages/add-account.html')).toString();
managementRouter.get('/management/add-account', (req, res)=>{
    res.send(addAccountPage);
})
managementRouter.post('/management/register_user', management, signUpValidate, (req, res)=>{
    const validation = validationResult(req);
    const errorCount = validation.errors.length;
    
    if(errorCount > 0){
        res.status(400).send('invalid credentials');
        return;
    }
    addOrgUser(req, res);
})

const grantPassPage = fs.readFileSync(path.join(__dirname, '../pages/grant-pass.html')).toString();
managementRouter.get('/grant-pass', management, (req, res)=>{
    res.send(grantPassPage);
})
const grantPass = async(req, res)=>{
    try{
        const {invited_user_id, gate_id, _date} = req.body;
        //ensure the gate belongs to the same organisation as this user
        const gate_organisation = await dbGetGateOrganisationId(pool, gate_id);
        const user_organisation = req.body.organisation_id;
        const user_id = req.body.user_id;
        const inviting_user_name = getTokenUserName(req, res);
        

        if(gate_organisation !== user_organisation){
            res.status(400).send('invalid request');
            return;
        }
        
        //ensure invited user exists
        if(await dbUserExists(pool, invited_user_id) !== true){
            res.status(400).send('invited user not found');
            return;
        }
        const invited_user_email = await dbGetUserEmail(pool, invited_user_id);

        const success = await dbGrantPass(pool, user_id, invited_user_id, gate_id, _date,
                            user_organisation, inviting_user_name, invited_user_email);
        
        if(success === false){
            res.status(500).send('internal server error');
            return
        }
        
        res.status(200).send('ok');
        return;
    }catch(e){
        return;
    }
}
managementRouter.post('/grant-pass', management, grantPassValidate, async(req, res)=>{
    const validation = validationResult(req);
    const errorCount = validation.errors.length;
    if(errorCount > 0){
        console.log(validation.errors);
    }
    await grantPass(req, res);
})
managementRouter.post('/search-user', management,emailValidate, async(req, res)=>{
    const validation = validationResult(req);
    const errorCount = validation.errors.length;
    
    const {email} = req.body;
    
    if(email === undefined){
        return;
    }

    if(errorCount > 0){
        res.status(400).send('invalid credentials');
        return;
    }
    
    const search_result = await dbSearchUserByEmail(pool, email);
    res.send(search_result);
})
const passListPage = fs.readFileSync(path.join(__dirname, '../pages/pass-page.html')).toString();
managementRouter.get('/management/pass-page', management, (req, res)=>{
    res.send(passListPage);
})
const getOrganisationPasses = async(req, res)=>{
    try{
        const organisation_id = req.body.organisation_id;
        const passes = await dbGetOrganisationPasses(pool, organisation_id);
        res.send(passes);
        return;
    }catch{
        res.status(400).send('invalid request');
        return;
    }
}
managementRouter.get('/management/pending-passes', management, async(req, res)=>{
    await getOrganisationPasses(req, res);
})
const getGateNames = async(req, res)=>{
    try{
        const {gate_ids} = req.body;
        let gateNames = [];
        for(let i = 0; i < gate_ids.length; i++){
            gateNames.push(await dbGetGateName(pool, gate_ids[i]));
        }
        res.send(gateNames);
    }catch{
        res.status(400).send('bad request');
    }
}
managementRouter.post('/management/get-gate-names', management, async(req, res)=>{
    getGateNames(req, res);
})
const accountsPage = fs.readFileSync(path.join(__dirname, '../pages/org_accounts.html')).toString();
managementRouter.get('/management/accounts-page', management, (req, res)=>{
    res.send(accountsPage);
})
const getAccountsData = async(req, res)=>{
    try{
        let user = (id, first_name, last_name, email, user_role)=>{
            return{
                id:id,
                first_name:first_name,
                last_name:last_name,
                email:email,
                user_role:user_role
            }
        }
        let users = [];
        const organisation_id = req.body.organisation_id;
        const account_ids = await dbGetOrgUserIds(pool, organisation_id);
        
        for(let i = 0; i < account_ids.length; i++){
            const accountData = await dbGetUserData(pool, account_ids[i].user_id);
            users.push(user(
                account_ids[i].user_id,
                accountData.first_name,
                accountData.last_name,
                accountData.email,
                ''));
        }
        for(let i = 0; i < account_ids.length; i++){
            const accountRole = await dbGetUserRole(pool, users[i].id);
            users[i].user_role = accountRole;
        }
        
        res.send(users);
    }catch(err){
        console.log(err);
        res.status(500).send();
    }
}
managementRouter.get('/management/accounts-data', getAccountsData);

managementRouter.delete('/management/delete-pass/:pass_id', async(req, res)=>{
    try{
        const pass_id = Number(req.params.pass_id);
        await dbDeletePass(pool, pass_id);
    }catch{
        res.status(500).send();
    }
})

//assign gates to securyty officers
const gateOfficersPage = fs.readFileSync(path.join(__dirname, '../pages/gate-officers.html')).toString();
managementRouter.get('/management/gate-officers', management, (req, res)=>{
    res.send(gateOfficersPage);
})
const getGateOfficerData = async(req, res)=>{
    try{
        const organisation_id = req.body.organisation_id;
        const gate_data = await dbGetGateOfficersData(pool, organisation_id);
        res.send(gate_data);
    }catch(err){
        console.error(err);
    }
}
managementRouter.get('/management/gate-officers-data', management, getGateOfficerData);
const getSecurityOfficers = async(req, res)=>{
    try{
        const organisation_id = req.body.organisation_id;
        const organisation_members = await dbGetOrgUserIds(pool, organisation_id);
        let security_ids = [];
        
        for(let i = 0; i < organisation_members.length; i++){
            if(await dbIsSecurityOfficer(pool, organisation_members[i].user_id)){
                security_ids.push(organisation_members[i].user_id);
            }
        }
        //constructor for gate officer objects
        const securityOfficer = (id, first_name, last_name)=>{
            return{id,first_name,last_name}
        }
        let security_officers = [];
        for(let i = 0; i < security_ids.length; i++){
            security_officers.push(securityOfficer(security_ids[i], '', ''));
            const user_data = await dbGetUserData(pool, security_ids[i]);
            security_officers[i].first_name = user_data.first_name;
            security_officers[i].last_name = user_data.last_name;
        }
        res.send(security_officers);
    }catch(err){
        console.error(err);
        res.status(500).send();
    }
}
managementRouter.get('/management/security-officers', management, getSecurityOfficers);

const setGateOfficer = async(req, res)=>{
    try{
        let {gate_officer, gate_id} = req.body;
        if(isNumber(gate_id) === false || isNumber(gate_officer) === false){
            res.status(400).send();
            return;
        }
        const organisation_id = req.body.organisation_id;
        const gate_org_id = await dbGetGateOrganisationId(pool, gate_id);
        if(organisation_id !== gate_org_id){
            res.status(400).send();
            return;
        }
        //the database uses null, we cannot use -1 or 0 since a user could be with id 0
        //  when we intend to set the id to null(nobody chossen)
        if(gate_officer === -1){
            gate_officer = null;
        }
        await dbSetGateOfficer(pool, gate_id, gate_officer);
        res.redirect('/management/security-officers');
    }catch(err){
        console.error(err);
        res.status(500).send();
    }
}
managementRouter.post('/management/set-gate-officer', management, setGateOfficer);

//Gate Records
const gateRecordsPage = fs.readFileSync(path.join(__dirname, '../pages/gate-records.html')).toString();
managementRouter.get('/management/gate-records', management, (req, res)=>{
    res.send(gateRecordsPage);
})
const getGateRecords = async(req, res)=>{
    try{
        const organisation_id = req.body.organisation_id;
        const gate_records = await dbGetGateRecords(pool, organisation_id);
        res.send(gate_records);
    }catch(err){
        console.error(err);
        res.status(500).send();
    }
}
managementRouter.get('/management/gate_records', management, getGateRecords);

const getAccountData = async(req, res)=>{
    try{
        const user_id = req.params.id;
        const user_data = await dbGetUserData(pool, user_id);
        res.send(user_data);
    }catch(err){
        console.error(err);
        res.status(500).send();
    }
}
managementRouter.get('/management/account/:id', management, getAccountData)

module.exports = {managementRouter};