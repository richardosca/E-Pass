/*
    importing the express package
    express is a HTTP server package that makes it easier to
        create a HTTP server with NodeJS
*/
const express = require('express');
//creating an express instance
const app = express();

//the express server will run on port 5000
const port_number = 5000;


/**
 request handler
 This function initializes all paths that this server will use
 */
 const { Handler } = require('./Handler');
Handler(app);

/*
    This allows the clients(browser) to request any file saved on the public folder
*/
app.use(express.static('public'));


/*
    the server will start listenning for incomming HTTP requests on the specified port number
    then it will run a callback function which will log a message confirming it has started listening
*/
app.listen(port_number,
    //callback function
    ()=>{
        console.log(`\nThe server is running on port ${port_number}.\n\nGo to http://localhost:${port_number}
        \nTo open the above link, press Ctrl while clicking the link\n\n`);
})