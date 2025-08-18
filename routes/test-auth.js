const express = require("express");
const testRouter = express.Router();

console.log('TEST ROUTER LOADED');

testRouter.post('/api/signin', (req, res) => {
    console.log('SIGNIN HIT!');
    res.json({message: "SIGNIN WORKS!"});
});

testRouter.post('/api/signup', (req, res) => {
    console.log('SIGNUP HIT!');
    res.json({message: "SIGNUP WORKS!"});
});

console.log('TEST ROUTES REGISTERED');
module.exports = testRouter;