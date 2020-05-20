var express = require('express');
var sqlite = require('sqlite3').verbose();
var dbFile = './calendar.db';

//Create Tables during the initial Setup
const createTablesNew = ()=> {
  let db = new sqlite.Database(dbFile);
  var tables = getCreateQueries();
  tables.forEach((sql) => {
    db.run(sql);
    console.log("Table created");
  });
  db.close();
  console.log("DB setup done");
}

const getCreateQueries = () => {
  const tables = [];
    //Event
    tables.push("CREATE TABLE IF NOT EXISTS Event(id TEXT PRIMARY KEY, subject TEXT, description TEXT, location TEXT, start NUMERIC, end NUMERIC, isRecurring INTEGER, repeatPattern TEXT, facultyId TEXT)");
    
    //Faculty
    tables.push("CREATE TABLE IF NOT EXISTS Faculty(id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, location TEXT)");
    
    //Work Hours
    tables.push("CREATE TABLE IF NOT EXISTS WorkHours(id TEXT, facultyId TEXT PRIMARY KEY, start NUMERIC, end NUMERIC, pattern TEXT, blockerNote TEXT, blockerEvents TEXT)");

    //Student(Participants) - Not used in this assignment. It will be useful if we have to manage Event Participants details
    tables.push("CREATE TABLE IF NOT EXISTS Student(id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, location TEXT, timezone TEXT)");

    //Attendance  - Not used in this assignment. It will be useful if we have to manage Event Participants details
    tables.push("CREATE TABLE IF NOT EXISTS Attendance(eventId TEXT, studentId TEXT, PRIMARY KEY (eventId, studentId))");
    return tables;
}

module.exports.createTablesNew = createTablesNew;

