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
    database: "library_db2023", 
});

app.use(express.json());

const crypto = require('crypto');
function hash(data) {
    const hash = crypto.createHash("sha256");
    hash.update(data);
    return hash.digest("hex");
}


const jwt = require("jsonwebtoken"); // npm i jsonwebtoken

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

            let passwordHash = hash(req.body.password);

            if (results[0].password === passwordHash) {
               /* res.send({
                    username: results[0].username,
                    firstname: results[0].firstname,
                    lastname: results[0].lastname,
                    email: results[0].email,
                    role: results[0].role,
                });*/

                let payload ={
                    sub: results[0].id,
                    username:results[0].username,
                    firstname: results[0].firstname,
                    lastname: results[0].lastname,
                    email: results[0].email,
                    role: results[0].role,
                    exp: Math.floor(Date.now()/1000) + (60*60) // time-limit token: current time + 1hour
                };
                let token = jwt.sign(payload, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956")
                res.json(token);
            } else {
                return res.status(401).send("401: Unauthorized");
            }
        }
    );
});

 function authToken (req, res, next){
    let authHeader = req.headers["auhorization"];
    if (authHeader = undefined){
        return res.status(400).send("Bad request");
    }
    let token = authHeader.slice(7);
    try{
        let decoded =jwt.verify(token, )
        req.decoded =decoded;
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


app.get("/token-info",  function(req, res){

    let authHeader = req.headers["authorization"];
    if(authHeader=== undefined){
        return res.status(400).send("Bad request")
    }
    
    let token = authHeader.slice(7);
    console.log("Token"+token);

    let decoded;
    try {
        decoded = jwt.verify(token, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956");
    } catch(error){
        console.log(error);
        return res.status(401).send("Invalid auth token");
    }

    let decoded_payload ={
        sub: decoded.sub,
        username:decoded.username,
        firstname: decoded.firstname,
        lastname: decoded.lastname,
        email: decoded.email,
        role: decoded.role,
        exp: decoded.exp,
        iat: decoded.iat
    }
    return res.status(200).send(decoded_payload);

}) 



/**
 * User endpoints
 * Role-> Admin or Visitor
 */
const users_columns = ["username", "password", "firstname", "lastname", "email", "role"];// users table
let userPath= "/user"

/**
 * Get own userinfo
 */

app.get(userPath+"/me", function(req, res){

    let authHeader = req.headers["authorization"];
    if(authHeader=== undefined){
        return res.status(400).send("Bad request")
    }
    
    let token = authHeader.slice(7);
    console.log("Token"+token);

    let decoded;
    try {
        decoded = jwt.verify(token, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956");
    } catch(error){
        console.log(error);
        return res.status(401).send("Invalid auth token");
    }

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

app.get(userPath+"/all", function (req, res) {

    //When you copy paste token in Insomnia "......"-> ......
    let authHeader = req.headers["authorization"];
    if(authHeader=== undefined){
        return res.status(400).send("Bad request")
    }
    
    let token = authHeader.slice(7);
    console.log("Token"+token);

    let decoded;
    try {
        decoded = jwt.verify(token, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956");
    } catch(error){
        console.log(error);
        return res.status(401).send("Invalid auth token");
    }

    if (decoded.role ==="Admin"){

    let sql = "SELECT * FROM users"; 
    con.query(sql,
         function (error, results, fields) {
     return res.status(200).send(results);
    });
} else{
    return res.status(403).send("Your are not admin! You cannot access this data")
} 

  });


  /**
 * Admin: Serch user by username
 * It is better to fix condition
 * http://localhost:3000/user/find?username=pegu
 *     
 */
/*
app.get(userPath+"/find/ByUsername/:username", function (req, res) {

    let authHeader = req.headers["authorization"];
    if(authHeader=== undefined){
        return res.status(400).send("Bad request")
    }
    
    let token = authHeader.slice(7);
    console.log("Token"+token);

    let decoded;
    try {
        decoded = jwt.verify(token, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956");
    } catch(error){
        console.log(error);
        return res.status(401).send("Invalid auth token");
    }

     console.log("DECODED: "+decoded);
     console.log("DECODED Role: "+decoded.role);

    if (decoded.role ==="Admin"){

  //let sql = "SELECT * FROM users"; 
  //let condition = createCondition(req.query); // output t.ex. " WHERE lastname='Rosencrantz'"

  //console.log(sql + condition); // t.ex. SELECT * FROM users WHERE lastname="Rosencrantz"

  con.query(
    `SELECT u FROM users u where LOWER (u.req.params.username) like LOWER(concat('%', ?1, '%'))`,
     (error, results, fields)=> {
    return res.status(200).send(results);
  });
} else {
    return res.status(403).send("Your are not admin! You cannot access this data")
}

});
*/

/**
 * Admin: Serch user by query;username,firstname, lastname, email, role 
 * It is better to fix condition
 * ex: http://localhost:3000/user/find?username=pegu
 *     http://localhost:3000/user/find?role=Admin
 */
app.get(userPath+"/find", function (req, res) {

    let authHeader = req.headers["authorization"];
    if(authHeader=== undefined){
        return res.status(400).send("Bad request")
    }
    
    let token = authHeader.slice(7);
    console.log("Token"+token);

    let decoded;
    try {
        decoded = jwt.verify(token, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956");
    } catch(error){
        console.log(error);
        return res.status(401).send("Invalid auth token");
    }

     console.log("DECODED: "+decoded);
     console.log("DECODED Role: "+decoded.role);

    if (decoded.role ==="Admin"){

  let sql = "SELECT * FROM users"; 
  let condition = createCondition(req.query); // output t.ex. " WHERE lastname='Rosencrantz'"

  console.log(sql + condition); // t.ex. SELECT * FROM users WHERE lastname="Rosencrantz"

  con.query(sql + condition, function (error, results, fields) {
    return res.status(200).send(results);
  });
} else {
    return res.status(403).send("Your are not admin! You cannot access this data")
}

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
 * Visitor: Show own userinfo
 */
app.get(userPath+"/byIdORUsername/:idORusername", function(req,res){
    let authHeader = req.headers["authorization"];
    if(authHeader=== undefined){
        return res.status(400).send("Bad request")
    }
    
    let token = authHeader.slice(7);
    console.log("Token"+token);

    let decoded;
    try {
        decoded = jwt.verify(token, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956");
    } catch(error){
        console.log(error);
        return res.status(401).send("Invalid auth token");
    }

     console.log("DECODED: "+decoded);
     console.log("DECODED Role: "+decoded.role);
    if (decoded.role ==="Admin"){
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

 } else{


    con.query(
        `SELECT * FROM users WHERE id=? OR username=?`,
    [decoded.sub, decoded.username], //sub is id
        (error, results, fieldes)=>{
        if(results.length>0){

            res.status(200).send(results);
        } else{
            res.status(404).send("404: Not found!");
        }
    });

 }
});

/**
 * Admin: create user with role Admin or Visitor
 */

app.post(userPath+"/add", function (req, res) {

    let authHeader = req.headers["authorization"];
    if(authHeader=== undefined){
        return res.status(400).send("Bad request")
    }
    
    let token = authHeader.slice(7);
    console.log("Token"+token);

    let decoded;
    try {
        decoded = jwt.verify(token, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956");
    } catch(error){
        console.log(error);
        return res.status(401).send("Invalid auth token");
    }

     console.log("DECODED: "+decoded);
     console.log("DECODED Role: "+decoded.role);

    if (decoded.role ==="Admin"){

    if (!req.body.username){
       return red.status(400).send("400: username required!")
    }

    //let fields =["username", "password", "firstname", "lastname", "email", "role"];
     for (let key in req.body){
        if(!users_columns.includes(key)){
            return res.status(400).send("Unknown users column: "+ key);
        }
     }

   let insertSql= `INSERT INTO users (username, password, firstname, lastname, email, role) 
   VALUES ('${req.body.username}', 
   '${hash(req.body.password)}',
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
    }else{
        return res.status(403).send("Your are not admin! You cannot create user.")
    }
});

/**
 * Admin: Update user by Id
 * Visitor: Update own userinfo
 */
app.put(userPath+"/update/:id", function (req, res) {

    let authHeader = req.headers["authorization"];
    if(authHeader=== undefined){
        return res.status(400).send("Bad request")
    }
    
    let token = authHeader.slice(7);
    console.log("Token"+token);

    let decoded;
    try {
        decoded = jwt.verify(token, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956");
    } catch(error){
        console.log(error);
        return res.status(401).send("Invalid auth token");
    }

     console.log("DECODED: "+decoded);
     console.log("DECODED Role: "+decoded.role);

    if (decoded.role ==="Admin"){

    const data= req.body;
    console.log(JSON.stringify(req.body))
    if (!(data && data.username && data.password && data.firstname && data.lastname && data.email && data.role)){

        return res.status(400).send("400: Bad request");
    }

    const userid= req.params.id; 
    const {username, password, firstname, lastname, email, role}= data;


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
                [username, hash(password), firstname, lastname, email, role, userid], // When user update password they use ordinary pass and change to hash
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



    
} else{
//*********Visitor***********
    const data= req.body;
    if (!(data && data.username && data.password && data.firstname && data.lastname && data.email && data.role)){

        return res.status(400).send("400: Bad request");
    }

    const userid= decoded.sub;// Visitor can access own data payload sub->id
    console.log("userid: "+JSON.stringify(userid))
    const {username, password, firstname, lastname, email, role}= data;

    con.query(
    `UPDATE users 
    SET username =?, password=?, firstname=?, lastname=?, email=?, role=? 
    WHERE id=?`,
    [username, hash(password), firstname, lastname, email, role, userid], // Wen user update password they use ordinary pass and change to hash
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

app.delete(userPath+"/delete/:id", function (req, res) {

    let authHeader = req.headers["authorization"];
    if(authHeader=== undefined){
        return res.status(400).send("Bad request")
    }
    
    let token = authHeader.slice(7);
    console.log("Token"+token);

    let decoded;
    try {
        decoded = jwt.verify(token, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956");
    } catch(error){
        console.log(error);
        return res.status(401).send("Invalid auth token");
    }

     console.log("DECODED: "+decoded);
     console.log("DECODED Role: "+decoded.role);

    if (decoded.role ==="Admin"){
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
} else {
    return res.status(403).send("Your are not admin! You cannot access this data")
}

});
