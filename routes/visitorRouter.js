const visitorRouter = require('express').Router();
const fs = require('fs');
const path = require('path');

//visitor middleware, ensures only visitors can access these areas
const {
    visitor
} = require('../auth');

//database pool
const {
    pool,
    dbGetVisitorPasses,
    dbGetGateName,
    dbGetOrganisationName} = require('../db');

//home page
const visitorPage = fs.readFileSync(path.join(__dirname, '../pages/visitor.html')).toString();
visitorRouter.get('/visitor', visitor, (req, res)=>{
    res.send(visitorPage);
});

visitorRouter.get('/visitor/pending-passes', visitor, async(req, res)=>{
    try{
        const user_id = req.body.user_id;
        const passes = await dbGetVisitorPasses(pool, user_id);
        res.send(passes);
    }catch(err){
        console.error(err);
        res.status(500).send();
    }
})

//get extra pass information from ids
visitorRouter.post('/visitor/get-pass-names', visitor, async(req, res)=>{
    try{
        const {gate_ids, organisation_ids} = req.body;
        let gate_names = [];
        let organisation_names = [];
        for(let i = 0; i < gate_ids.length; i++){
            gate_names.push(await dbGetGateName(pool, gate_ids[i]));
        }
        for(let i = 0; i < organisation_ids.length; i++){
            organisation_names.push(await dbGetOrganisationName(pool, organisation_ids[i]));
        }
        res.send({
            organisation_names,
            gate_names
        });
    }catch(err){
        console.error(err);
        res.status(500).send();
    }
})

module.exports = {
    visitorRouter
}