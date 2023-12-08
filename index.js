let express= require('express');
let app = express();
app.listen(3000);
console.log("Serve runs:port 3000");

app.get("/", function(req, res){
    res.sendFile(__dirname +"/dokumentation.html");
});

const mysql = require("mysql2");
con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "topic_db2023", 
});

app.use(express.json());


const dotenv = require('dotenv'); // npm i dotenv ->To bring token i .env install dotenv
dotenv.config();
const crypto = require('crypto');
const jwt = require("jsonwebtoken"); // npm i jsonwebtoken

/*
function hash(data) {
    const hash = crypto.createHash("sha256");
    hash.update(data);
    return hash.digest("hex");
}
*/


function hashSalting(password){
    const salt = crypto.randomBytes(16).toString('hex');
    const hash= crypto.createHash('sha256');
    hash.update(password+salt);
    const hashSaltingPassword = hash.digest('hex');

    const conbinedPassword = salt + ':'+ hashSaltingPassword 

    return conbinedPassword;
}

console.log("conbinedPassword: ", hashSalting("m123"))

let secretKey= () =>{
    var key = crypto.randomBytes(32).toString('hex');
    return key;
}

 const JWT_SECRET =process.env.TOKEN_SECRET||secretKey();
 /**
  * Function signJWT: to sign a JWT
  * @param {*} payload 
  * @returns 
  */
 let signJWT =(payload)=>{
  return jwt.sign(payload, JWT_SECRET)
 }
 /**
  * Function decodeJWT : to Verify and decode a JWT
  * @param {*} token 
  * @returns 
  */

 let decodeJWT = (token) =>{
    try{
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch(error){
        return null;
    }
 }

app.post("/login", function (req, res) {

    if (!(req.body && req.body.username && req.body.password)) {

        return res.status(400).send("400: Not found such a user!");
      }

    con.query(
        'SELECT * FROM users WHERE username = ?',
        [req.body.username],
        (error, results) => {
            if (error) {
                console.error("Error: Login user error!");
                return res.status(500).send("500: Error logging in");
            }

            if (results.length === 0) {
                return res.status(401).send("401: Unauthorized");
            }

            let enteredPass=req.body.password;// userinput
            let storedConbinedPassword= results[0].password; // from database
            const [storedSalt, storedHashPassword] =  storedConbinedPassword.split(':');
            const hash = crypto.createHash('sha256');
            hash.update(enteredPass+storedSalt);// Use same salt which is stored in database
            const hasedEnteredPassword= hash.digest('hex');

            //1.The first user admin is added from databasen with original password(ex: m123)
            //2. Change if argument: if (results[0].password === req.body.password)
            //3. Go to Update same password(ex: m123) -> hashSalting stor ConbinedPassword i database
            //4. Change if argument: if (hasedEnteredPassword === storedHashPassword)
            //5. Login again!
    
             if (hasedEnteredPassword === storedHashPassword) {  
               // if (results[0].password === req.body.password){// When you login the first time as Admin user

                let payload ={
                    sub: results[0].id,
                    username:results[0].username,
                    firstname: results[0].firstname,
                    lastname: results[0].lastname,
                    email: results[0].email,
                    role: results[0].role,
                    exp: Math.floor(Date.now()/1000) + (60*60) // time-limit token: current time + 1hour
                };
                let token = signJWT(payload);
                res.json(token);
            } else {
                return res.status(401).send("401: Unauthorized");
            }
        }
    );
});

 function authToken (req, res, next){
    let authHeader = req.headers["authorization"];
    if (authHeader === undefined){
        return res.status(400).send("Bad request! Auth header is undefined.");
    }

    let token = authHeader.slice(7);
    try{
        let decoded =decodeJWT(token);
        console.log("req.decoded"+JSON.stringify(req.decoded))
        console.log("decoded"+JSON.stringify(decoded))
        req.decoded =decoded;
        console.log("req.decoded"+JSON.stringify(req.decoded))
       if (decoded===null) {
            return res.status(400).send("Bad request! Decoded token is null. (Check: token is expired, fail token or token not set )")
        }
        next(); // Go to next middleware or route handler
    } catch(error){
        console.log(error);
        return res.status(401).send("Invalid Authentication Token")
    }
 }

 function isAdmin(req, res, next){
    const decoded =req.decoded;

    if (decoded.role!=="Admin"){
        return res.status(403).send("You are not an Admin! Access denied.")
    }
    next();
 }
 
 /**
  * Admin and Visitor: Get own token info
  */

app.get("/token-info", authToken, function(req, res){
    const decoded=req.decoded;

    console.log(JSON.stringify(req.decoded))
    let decoded_payload ={
        sub: decoded.sub, // sub = id
        username:decoded.username,
        firstname: decoded.firstname,
        lastname: decoded.lastname,
        email: decoded.email,
        role: decoded.role,
        exp: decoded.exp,
        iat: decoded.iat
    }
    return res.status(200).send(decoded_payload);

}); 



/**
 * User endpoints
 * Role-> Admin or Visitor
 */
const users_columns = ["username", "password", "firstname", "lastname", "email", "role"];// users table
let userPath= "/user"

/**
 * Get own userinfo
 */

app.get(userPath+"/me", authToken,function(req, res){
    const decoded= req.decoded;
    con.query(
    `SELECT * FROM users WHERE id=?`,
    [decoded.sub],// sub =id
    (error, results,fields) =>{

        let output ={
            id: results[0].id,
            username: results[0].username,
            firstname: results[0].firstname,
            lastname: results[0].lastname,
            email:results[0].email,
            role: results[0].role,
        };

        return res.status(200).send(output);
    })        
}) ;


/**
 * Admin: Get all users
 */

app.get(userPath+"/all", authToken, isAdmin, function (req, res) {

    let sql = "SELECT * FROM users"; 
    con.query(sql,
         function (error, results, fields) {
     return res.status(200).send(results);
    });
});


/**
 * Admin: Serch user by query;username,firstname, lastname, email, role 
 * It is better to fix condition
 * ex: http://localhost:3000/user/find?username=pegu
 *     http://localhost:3000/user/find?role=Admin
 */
app.get(userPath+"/find", authToken, isAdmin, function (req, res) {

  let sql = "SELECT * FROM users"; 
  let condition = createCondition(req.query); // output t.ex. " WHERE lastname='Rosencrantz'"

  console.log(sql + condition); // t.ex. SELECT * FROM users WHERE lastname="Rosencrantz"

  con.query(sql + condition, function (error, results, fields) {
    return res.status(200).send(results);
  });

});

let createCondition =(query) => {
  console.log("QUERY: "+ JSON.stringify(query)) //{"username":"pegu"}
  let output= " WHERE ";
  for(let key in query){
    if(users_columns.includes(key)){
        console.log("Key: "+key)// username
        console.log("query[key]: "+ query[key]);//pegu
        output += `${key}="${query[key]}" OR `;
    }
  }
  if (output.length ==7){ //" WHERE " This is 7 length
    console.log("Output: " +output) //let output= " WHERE ";
    return"";
  } else{
    return output.substring(0, output.length -4);// Delete " OR "
  }
};


/**
 * Admin: Search user byId OR byUsername
 */
app.get(userPath+"/byIdORUsername/:idORusername", authToken, isAdmin, function(req,res){
   
    const id_username= req.params.idORusername;

    con.query(
        `SELECT * FROM users WHERE id=? OR username=?`,
        [id_username, id_username], 
        (error, results, fieldes)=>{
        if(results.length>0){
            res.status(200).send(results);
        } else{
            res.status(404).send("404: Not found!");
        }
    });
});

/**
 * Admin: create user with role Admin or Visitor
 */

let inputRequiredMessage =(input, field_name)=>{
    if (typeof input!=="string"||input.trim()===""){
        
   return field_name +"(Type:String) is required! ";
 }
   return ""
}

 
app.post(userPath+"/add", authToken, isAdmin, function (req, res) {
    let errormessage = "400: "
    errormessage += inputRequiredMessage(req.body.username, "username");
    errormessage += inputRequiredMessage(req.body.password,"password");
    errormessage += inputRequiredMessage(req.body.firstname,"firstname");
    errormessage += inputRequiredMessage(req.body.lastname,"lastname");
    errormessage += inputRequiredMessage(req.body.email,"email");
    errormessage += inputRequiredMessage(req.body.role,"role");

    if(errormessage!=="400: "){
        return res.status(400).send( errormessage)
    
}

    //let fields =["username", "password", "firstname", "lastname", "email", "role"];
     for (let key in req.body){
        if(!users_columns.includes(key)){
            return res.status(400).send("Unknown users column: "+ key);
        }
     }

   let insertSql= `INSERT INTO users (username, password, firstname, lastname, email, role) 
   VALUES ('${req.body.username}', 
   '${hashSalting(req.body.password)}',
   '${req.body.firstname}',
   '${req.body.lastname}',
   '${req.body.email}',
   '${req.body.role}')`;
   console.log(insertSql)

    con.query(insertSql,
        
            (error, results) =>{ 
    
                if(error){
                    console.error("Adding user Error!: "+ error);//error detail
                    
                    return res.status(500).send("500: Error adding user")
                }

              console.log(results)

              let selectSql = 'SELECT LAST_INSERT_ID() as insertId';
    

    con.query(selectSql, (error, results) => {
            if(error){
                console.error("Error retrieving last insert ID: " + err);
                return res.status(500).send("500: Error retrieving user ID");
            }

                let output ={
                    id: results[0].insertId,
                    username: req.body.username,
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    email:req.body.email,
                    role: req.body.role,
                };// do not return password!!!
                return res.status(201).send(output);
            });

        });
});


/**
 * Admin adn Visitor: Update own user info
 */
app.put(userPath+"/update/me", authToken, function (req, res) {

    let errormessage = "400: "
    errormessage += inputRequiredMessage(req.body.username, "username");
    errormessage += inputRequiredMessage(req.body.password,"password");
    errormessage += inputRequiredMessage(req.body.firstname,"firstname");
    errormessage += inputRequiredMessage(req.body.lastname,"lastname");
    errormessage += inputRequiredMessage(req.body.email,"email");
    errormessage += inputRequiredMessage(req.body.role,"role");

    if(errormessage!=="400: "){
        return res.status(400).send( errormessage)
}
const decoded=req.decoded; 
const userid= decoded.sub;// Visitor can access own data payload sub->id
console.log("userid: "+JSON.stringify(userid))
const {username, password, firstname, lastname, email, role}= req.body;

con.query(
`UPDATE users 
SET username =?, password=?, firstname=?, lastname=?, email=?, role=? 
WHERE id=?`,
[username, hashSalting(password), firstname, lastname, email, role, userid], // Wen user update password they use ordinary pass and change to hash
 (error, results, fieldes) => {
    if (error){
        console.error("Update user error!" +error);
      return  res.status(500).send("500:Error updating error")
    } else {

        let output ={
            id: parseInt(userid),
            username: req.body.username,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email:req.body.email,
            role: req.body.role,
        };// do not return password!!!
        return res.status(200).send(output);
        //res.status(200).send("200: OK!")
    }
});

});

/**
 * Admin: Update user by Id
 * Visitor: Update own userinfo
 * !! You do not place app.put(userPath+"/update/me",...  route after this route. (do not want to check isAdmin )
 * isAdmin contenue to check app.put(userPath+"/update/me",... due to the way middleware cascades down the route stack.
 * 
 */
app.put(userPath+"/update/:id", authToken, isAdmin, function (req, res) {

    let errormessage = "400: "
    errormessage += inputRequiredMessage(req.body.username, "username");
    errormessage += inputRequiredMessage(req.body.password,"password");
    errormessage += inputRequiredMessage(req.body.firstname,"firstname");
    errormessage += inputRequiredMessage(req.body.lastname,"lastname");
    errormessage += inputRequiredMessage(req.body.email,"email");
    errormessage += inputRequiredMessage(req.body.role,"role");

    if(errormessage!=="400: "){
        return res.status(400).send( errormessage)
}

    //const data= req.body;
    //console.log(JSON.stringify(req.body))
    //if (!(data && data.username && data.password && data.firstname && data.lastname && data.email && data.role)){
    //    return res.status(400).send("400: Bad request");
    //}

    const userid= req.params.id; 
    const {username, password, firstname, lastname, email, role}= req.body;


    con.query(
        `SELECT * FROM users WHERE id=?`,
        [userid], 
        (error, results, fieldes)=>{
        if(results.length===0){
            res.status(404).send("404: Not found! This id: "+userid +" doesn´t exist.");
            console.log("There is no such a id")
        } else{

            con.query(
                `UPDATE users 
                SET username =?, password=?, firstname=?, lastname=?, email=?, role=? 
                WHERE id=?`,
                [username, hashSalting(password), firstname, lastname, email, role, userid], // When user update password they use ordinary pass and change to hash
                 (error, results, fieldes) => {
                    if (error){
                        console.error("Update user error!" +error);
                      return  res.status(500).send("500:Error updating error")
                    } else {
            
                        let output ={
                            id: parseInt(userid),
                            username: req.body.username,
                            firstname: req.body.firstname,
                            lastname: req.body.lastname,
                            email:req.body.email,
                            role: req.body.role,
                        };// do not return password!!!
                        return res.status(200).send(output);
                        //res.status(200).send("200: OK!")
                    }
                });
        }
    });
});

/**
 * Admin: Delete user byId
 */
app.delete(userPath+"/delete/:id", authToken, isAdmin, function (req, res) {

      const userid= req.params.id; 

      con.query(`DELETE FROM users WHERE id=?`,
      [userid],
      (error, results, fields)=> {
        if (error){
            console.error("Delete user error!" +error);
          return  res.status(500).send("500:Error delete user")
        }
    return res.status(200).send("This id: "+ userid + " is deleted.");
  });
});


/**
 * Topic endpoints
 * Role-> Admin or Visitor
 */
const topics_columns = ["heading", "comment", "user_id"];// topics table
let topicPath= "/topic"

/**
 * Get all topics
 */
app.get(topicPath+"/all", authToken,function(req, res){
    let sql = "SELECT * FROM topics"; 
    con.query(sql,
         function (error, results, fields) {
     return res.status(200).send(results);
    });    
}) ;

/**
 * Get topics by user_id
 */
app.get(topicPath+"/user/:user_id", authToken,function(req, res){
    const userid= req.params.user_id; 
    con.query(
        `SELECT * FROM topics WHERE user_id=?`,
        [userid],
        (error, results, fieldes)=>{
            if(results.length>0){
                res.status(200).send(results);
            } else{
                res.status(404).send("404: Not found!");
            }
        });
}) ;


/**
 * Admin: create topic with role Admin or Visitor
 */

 
app.post(topicPath+"/add", authToken, function (req, res) {
    let errormessage = "400: "
    const decoded=req.decoded; 
    const userid= parseInt(decoded.sub);
    errormessage += inputRequiredMessage(req.body.heading, "heading");
    errormessage += inputRequiredMessage(req.body.comment,"comment");
    //errormessage += inputRequiredMessage(userid,"userid"); INt!

    if(errormessage!=="400: "){
        return res.status(400).send( errormessage)
    
}

     for (let key in req.body){
        if(!topics_columns.includes(key)){
            return res.status(400).send("Unknown users column: "+ key);
        }
     }

   let insertSql= `INSERT INTO topics (heading, comment, user_id) 
   VALUES ('${req.body.heading}', 
   '${hashSalting(req.body.comment)}',
   '${userid}')`; // User do not touch this data
   console.log(insertSql)

    con.query(insertSql,
        
            (error, results) =>{ 
    
                if(error){
                    console.error("Adding user Error!: "+ error);//error detail
                    
                    return res.status(500).send("500: Error adding user")
                }

              console.log(results)

     let selectSql = 'SELECT LAST_INSERT_ID() as insertId';

    con.query(selectSql, (error, results) => {
            if(error){
                console.error("Error retrieving last insert ID: " + err);
                return res.status(500).send("500: Error retrieving user ID");
            }

                let output ={
                    id: results[0].insertId,
                    heading: req.body.heading,
                    comment: req.body.comment,
                    user_id: userid,
                };
                return res.status(201).send(output);
            });

        });
});