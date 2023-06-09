const securityRouter = require('express').Router();
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const {
    security 
} = require('../auth');

const { 
    pool,
    dbSearchTodaysPasses,
    dbAddGateRecord,
    dbGetPassInfo,
    dbDeletePass,
    dbSearchUserByEmail,
    dbSearchPendingExit,
    dbGetUserData,
    dbProcessExit,
    dbGetOfficerGates
} = require('../db');

const {
    emailSearch, isNumber, processEntry
} = require('../validator');

//home page
const securityPage = fs.readFileSync(path.join(__dirname, '../pages/security.html')).toString();
securityRouter.get('/security', security, (req, res)=>{
    res.send(securityPage);
});

const getMyGate = async(req, res)=>{
    try{
        const officer_id = req.body.user_id;
        const gates = await dbGetOfficerGates(pool, officer_id);
        res.send(gates);
    }catch(err){
        console.error(err);
        res.status(500).send();
    }
}
securityRouter.get('/security/my-gate', security, getMyGate);

const searchTodaysPasses = async(req, res)=>{
    try{
        const {email, gate_id} = req.body;
        if(isNumber(gate_id) === false){
            res.status(400).send();
            return;
        }
        const passes = await dbSearchTodaysPasses(pool, gate_id, email);
        res.status(200).send(JSON.stringify(passes));
    }catch(err){
        res.status(500).send();
    }
}
securityRouter.post('/security/search-todays-passes', emailSearch, security, (req, res)=>{
    const validation = validationResult(req);
    const errorCount = validation.errors.length;

    if(errorCount > 0){
        res.status(400).send('invalid credentials');
        return;
    }
    searchTodaysPasses(req, res);
});

const process_entry = async(req, res)=>{
    try{
        const {pass_id, vehicle_registration, luggage_description} = req.body;
        const now = new Date().toJSON();
        const organisation_id = req.body.organisation_id;
        const officer_id = req.body.user_id;
        const {inviting_user_id, gate_id, invited_user_id} = await dbGetPassInfo(pool, pass_id);
        
        //add new gate record
        const gr_success = await dbAddGateRecord(
            pool,
            invited_user_id,
            officer_id,
            vehicle_registration,
            luggage_description,
            now,
            inviting_user_id,
            organisation_id,
            gate_id
        );
        
        //delete the used pass
        await dbDeletePass(pool, pass_id);
        res.redirect('/');
    }catch(err){
        console.log(err);
        res.status(500).send();
    }
}
securityRouter.post('/security/process-entry', security, (req, res)=>{
    const validation = validationResult(req);
    const errorCount = validation.errors.length;

    if(errorCount > 0){
        res.status(400).send('invalid credentials');
        return;
    }
    process_entry(req, res);
});
const processExitPage = fs.readFileSync(path.join(__dirname, '../pages/process-exit.html')).toString();
securityRouter.get('/security/process-exit', security, (req, res)=>{
    res.send(processExitPage);
})

const searchPendingExit = async(req, res)=>{
    try{
        let {email} = req.body;
        const searchRes = await dbSearchUserByEmail(pool, email);
        const organisation_id = req.body.organisation_id;
        //we only want one matching email address for subsequent processes
        if(searchRes.length !== 1){
            res.status(200).send();
            return;
        }
        const user_id = searchRes[0].id;
        const pending_exit = await dbSearchPendingExit(pool, user_id, organisation_id);
        if(pending_exit === undefined){
            res.send('not-found');
            return;
        }
        const {id, visitor_id, luggage_description, vehicle_registration} = pending_exit;
        const user_data = await dbGetUserData(pool, visitor_id);
        res.send({
            id,
            visitor_id,
            luggage_description,
            vehicle_registration,
            user_data
        })
    }catch(err){
        console.error(err);
        res.status(500).send();
    }
}
securityRouter.post('/security/search-pending-exit', security, emailSearch, (req, res)=>{
    const validation = validationResult(req);
    const errorCount = validation.errors.length;

    if(errorCount > 0){
        res.status(400).send();
        return;
    }
    searchPendingExit(req, res);
})

const processExit = async(req, res)=>{
    try{
        const {gate_record_id} = req.body;
        if(isNumber(gate_record_id) === false){
            res.status(400).send();
            return;
        }
        const now = new Date().toJSON();
        await dbProcessExit(pool, gate_record_id, now);
        res.redirect('/security/process-exit');
    }catch(err){
        console.error(err);
        res.status(500).send();
    }
}
securityRouter.post('/security/process-exit', security, processExit);

module.exports = {
    securityRouter
}