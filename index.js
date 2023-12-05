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
                    sub: results[0].username,
                    firstname: results[0].firstname,
                    lastname: results[0].lastname,
                    email: results[0].email,
                    role: results[0].role,
                };
                let token = jwt.sign(payload, "fghjl#a/s&asojcd12askpe%nvhuhimitsu956")
                res.json(token);
            } else {
                return res.status(401).send("401: Unauthorized");
            }
        }
    );
});



/**
 * User/Admin or Visitor
 */
const users_columns = ["username", "password", "firstname", "lastname", "email", "role"];// users table
let userPath= "/user"

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

     console.log("DECODED: "+decoded);
     console.log("DECODED Role: "+decoded.role);
    if (decoded.role ==="Admin"){

    let sql = "SELECT * FROM users"; 
    con.query(sql, function (error, results, fields) {
      res.status(200).send(results);
    });
} else{
    return res.send("Your are not admin! You cannot access this data")
} 

  });


app.get(userPath+"/find", function (req, res) {
  let sql = "SELECT * FROM users"; 
  let condition = createCondition(req.query); // output t.ex. " WHERE lastname='Rosencrantz'"
  console.log(sql + condition); // t.ex. SELECT * FROM users WHERE lastname="Rosencrantz"

  con.query(sql + condition, function (error, results, fields) {
    res.status(200).send(results);
  });
});


let createCondition =(query) => {
  console.log("QUERY: "+query) 
  let output= " WHERE ";
  for(let key in query){
    if(users_columns.includes(key)){
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


app.get(userPath+"/byId/:id", function(req,res){
    let sql=`SELECT * FROM users WHERE id=` +req.params.id;
    console.log(sql);
    con.query(sql, 
        (error, results, fieldes)=>{
        if(results.length>0){
            res.status(200).send(results);
        } else{
            res.status(404).send("404: Not found!");
        }

    })

});

app.post(userPath+"/add", function (req, res) {

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
    

    con.query(selectSql, (err, results) => {
            if(err){
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
                return res.sendStatus(200).send(output);
            });

        });
});


app.put(userPath+"/update/:id", function (req, res) {
    if (!(req.body && req.body.username && req.body.password && req.body.firstname && req.body.lastname && req.body.email && req.body.role)){

        return res.status(400).send("400: Bad request");
    }

    const userid= req.params.id;

    con.query(
    `UPDATE users 
    SET username ='${req.body.username}', password='${hash(req.body.password)}', firstname= '${req.body.firstname}', lastname= '${req.body.lastname}', email= '${req.body.email}',role='${req.body.role}' 
    WHERE id='${userid}'`,
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

    }
    )
});