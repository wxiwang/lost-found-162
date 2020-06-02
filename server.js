// server.js
// The code that runs on the server.
// Like all servers, it gets HTTP requests and returns HTTP responses

const express = require('express');

const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const sql = require("sqlite3").verbose();

const LostFoundDB = new sql.Database("LostFound.db");
const FormData = require("form-data");
const crypto = require("crypto");

// Actual table creation; only runs if "shoppingList.db" is not found or empty
// Does the database table exist?
let cmd = " SELECT name FROM sqlite_master WHERE type='table' AND name='LostFoundTable' ";
LostFoundDB.get(cmd, function (err, val) {
    console.log(err, val);
    if (val == undefined) {
        console.log("No database file - creating one");
        createDB();
    } else {
        console.log("Database file found");
    }
});

function createDB() {
  // explicitly declaring the rowIdNum protects rowids from changing if the 
  // table is compacted; not an issue here, but good practice
  const cmd = 'CREATE TABLE LostFoundTable ( rowIdNum INTEGER PRIMARY KEY, lostFound TEXT,title TEXT, category TEXT, description TEXT, photoURL TEXT, date TEXT, time TEXT, location TEXT)';
  LostFoundDB.run(cmd, function(err, val) {
    if (err) {
      console.log("Database creation failure",err.message);
    } else {
      console.log("Created database");
    }
  });
}

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname+'/images')    
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
// let upload = multer({dest: __dirname+"/assets"});
let upload = multer({storage: storage});


// begin constructing the server pipeline
const app = express();



// A middleware function to handles the GET query /shoppingList
// Observe that it either ends up sending the HTTP response or calls next(), so it
// is a valid middleware function. 
function handleShoppingList(request, response, next) {
  let cmd = "SELECT * FROM LostFOundTable"
  LostFoundDB.all(cmd, function (err, rows) {
    if (err) {
      console.log("Database reading error", err.message)
      next();
    } else {
      // send shopping list to browser in HTTP response body as JSON
      response.json(rows);
      //console.log("rows",rows);
    }
  });
  
  /* Example of just getting first row
  let xcmd = ' SELECT * FROM ShopTable WHERE rowid = 1';
  shopDB.get( xcmd, dataCallback );
    
  function dataCallback( err, rowData ) {    
     if (err) { console.log("error: ",err.message); }
     else { console.log( "got: ", rowData);   }} 
  */

}
  

// Now construct the server pipeline

// First, make all the files in 'public' available
app.use(express.static("public"));

app.use("/images",express.static('images'));

// Special case for request with just the base URL
app.get("/", function (request, response) {
  response.sendFile(__dirname + "/public/index.html");
});


// send the current shopping list to the webpage for this kind of GET request
// The middleware function handleShoppingList is defined above
app.get("/shoppingList", handleShoppingList);


// Handle a post request to upload an image. 
app.post('/upload', upload.single('newImage'), function (request, response) {
  console.log("Recieved",request.file.originalname,request.file.size,"bytes")
  if(request.file) {
    // file is automatically stored in /images, 
    // even though we can't see it. 
    // We set this up when configuring multer
    sendMediaStore("/images/"+request.file.originalname,request,response);
    //let path = "images/"+request.file.originalname;
    
    
  }
  else throw 'error';
});

// The body-parser is used on requests with application/json in header
// parses the JSON in the HTTP request body, and puts the resulting object 
// into request.body
app.use(bodyParser.json()); 
// Now that we have the body, handle the POST request
// The anonymous function is a middleware function
app.post("/newFound", function(request, response, next) {
  console.log("Server recieved",request.body);
  let lostFound = request.body.lostFound;
  let title = request.body.title;
  let category = request.body.category;
  let description = request.body.description;
  let photoURL = request.body.photoURL;
  let date = request.body.date;
  let time = request.body.time;
  let location = request.body.time;
  console.log("new title:",title);
  
  // put new item into database
  cmd = "INSERT INTO LostFoundTable ( lostFound, title, category, description, photoURL, date, time, location) VALUES (?,?,?,?,?,?,?,?) ";
  LostFoundDB.run(cmd,lostFound,title,category,description,photoURL,date,time,location, function(err) {
    if (err) {
      console.log("DB insert error",err.message);
      next();
    } else {
      let newId = this.lastID; // the rowid of last inserted item
      response.send("Got new item, inserted with rowID: "+newId);
    }
  }); // callback, shopDB.run
}); // callback, app.post


// custom 404 page (not a very good one...)
// last item in pipeline, sends a response to any request that gets here
app.all("*", function (request, response) { 
  response.status(404);  // the code for "not found"
  response.send("This is not the droid you are looking for"); });


// listen for requests :)
const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});

function sendMediaStore(filename, serverRequest, serverResponse) {
  let apiKey = "0nj1xdfyo0";
  if (apiKey === undefined) {
    serverResponse.status(400);
    serverResponse.send("No API key provided");
  } else {
    // we'll send the image from the server in a FormData object
    let form = new FormData();
    
    // we can stick other stuff in there too, like the apiKey
    form.append("apiKey", apiKey);
    // stick the image into the formdata object
    form.append("storeImage", fs.createReadStream(__dirname + filename));
    // and send it off to this URL
    form.submit("http://ecs162.org:3000/fileUploadToAPI", function(err, APIres) {
      // did we get a response from the API server at all?
      if (APIres) {
        // OK we did
        console.log("API response status", APIres.statusCode);
        // the body arrives in chunks - how gruesome!
        // this is the kind stream handling that the body-parser 
        // module handles for us in Express.  
        let body = "";
        APIres.on("data", chunk => {
          body += chunk;
        });
        APIres.on("end", () => {
          // now we have the whole body
          if (APIres.statusCode != 200) {
            serverResponse.status(400); // bad request
            serverResponse.send(" Media server says: " + body);
          } else {
            serverResponse.status(200);
            serverResponse.send(body);
          }
        });
      } else { // didn't get APIres at all
        serverResponse.status(500); // internal server error
        serverResponse.send("Media server seems to be down.");
      }
    });
  }
}

