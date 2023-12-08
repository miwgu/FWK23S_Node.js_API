drop database if exists topic_db2023;
create database topic_db2023;
use topic_db2023;

-- I use hash to password so it need varchar(100)
create table users(

id int not null auto_increment primary key,
username varchar(50) not null, 
password varchar(100) not null,
firstname varchar(255) not null,
lastname varchar(255) not null,
email varchar(50) not null,
role varchar(50) not null
 );
 
create table topics(
id int not null auto_increment primary key,
heading varchar(255) ,
comment varchar(3000) , 
user_id int not null ,
time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
foreign key (user_id) references users(id));
 
  insert into users (username,password,firstname,lastname,email,role) values
("migu","m123","Miwa","Guhrés","example1@hotmail.com","Admin");

insert into topics (heading,comment,user_id,time) values
("Ska vi inte äta ute","Jag tänker att jag ska äta lunch ute idag. Vill nogån hänga med?",1,"2020-11-23 10:41:05");
