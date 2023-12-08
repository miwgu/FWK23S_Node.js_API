# FWK23S_Node.js_API
##  Endpoint 
13 routes 
check dokumentation.html 

## How to start (Node.js)
npm install 
nodemon -g express jsonwebtoken dotenv mysql2 (mysql2: This is for MySQL workbench. If you use other database you need to check which you need to install.)
- nodemon index.js
- user: "root", password: "" ...//You need to change code, your user and password in index.js to log in your database 

## Database 
You can check data.sql

## API Development Platform (Insomnia)
Import Insomnia_topic_db2023.json

## Log in 
- username: migu password: m123 (role:Admin)
- You need to change login routes code then you can login with m123 as Admin role and update password. You can change to hashSalting code then you login again.  
- Read rad 114 in index.js
