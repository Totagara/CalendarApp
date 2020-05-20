var sqlite = require('sqlite3').verbose();
var dbFile = './calendar.db';

//db.all
exports.sqlite_getAll = (query, queryParams) => {
  return new Promise(function (resolve, reject) {
    var db = new sqlite.Database(dbFile, sqlite.OPEN_READONLY);
    db.all(query, queryParams, function (err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
      db.close();
    });
  });
}

//db.run
exports.sqlite_run = (insertSQL, queryVals) => {
  return new Promise(function (resolve, reject) {
    let db = new sqlite.Database(dbFile);
    db.run(insertSQL, queryVals, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes);
      }
      db.close();
    });
  });
}

//Debug DB: check if tables created
exports.readTableNames = () => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, records) => {
    if (err) {
      console.log("All tables err: " + err);
    } else {
      console.log(records.length);
      records.forEach(function (rec) {
        console.log("table : " + rec.name);
      });
    }
  });
}
