var calUtil = require('./calUtil');
var dbHelper = require('./dbHelper');

//Get Users
exports.getUsers = (colName, colValue) => {
  var queryParams = [];
  var query = 'SELECT id, name, email, phone, location FROM Faculty';
  //this is true only for single user call
  if (colName && colValue) {
    var isSingleEvent = true;
    query = query + ' WHERE ' + colName + '=?';
    queryParams.push(colValue);
  }

  return new Promise(function (resolve, reject) {
    var dbPromise = dbHelper.sqlite_getAll(query, queryParams);
    dbPromise.then((users) => {
      if (users.length > 0) {
        if (isSingleEvent) {
          resolve({ status: 200, users: users[0] });
        } else {
          resolve({ status: 200, users: users });
        }
      } else {
        resolve({ status: 204, users: "No content." });
      }
    })
      .catch((err) => {
        reject({ status: 500, message: err.message });
      });
  });
}

//Get availability of a User
exports.getUserAvailability = (id, startVal, endVal, excludeIds) => {
  return new Promise(function (resolve, reject) {
    //validate the input
    if (!id || !calUtil.validateDate(startVal, endVal)) {
      reject({ status: 400, message: 'Bad request. Make sure valid id, start date-time and end date-time is given.' });
    }

    var query = "SELECT (SELECT 1 from Faculty WHERE id=?) as userExist, isRecurring, repeatPattern, start, end FROM Event WHERE facultyId = ? AND ( (start >= ? AND end <= ?) OR (isRecurring=1 AND time(start, 'utc') >= time(?, 'utc') AND time(end, 'utc') <= time(?, 'utc')))";

    var startDateParam = new Date(startVal).toISOString();
    var endDateParam = new Date(endVal).toISOString();
    var queryParams = [id, id, startDateParam, endDateParam, startDateParam, endDateParam];

    //if any ids to be excluded - can be used to check availability, while updating the Event
    if (excludeIds) {
      query = query + '  AND id NOT IN(?)';
      queryParams.push(excludeIds);
    }

    var dbPromise = dbHelper.sqlite_getAll(query, queryParams);
    dbPromise.then((results) => {
      if (results.length == 0) {
        //check if user exist
        var selectCheckSql = "SELECT CASE WHEN EXISTS(SELECT 1 from Faculty WHERE id=?) THEN 1 ELSE 0 END as userExists";
        var userCheckPromise = dbHelper.sqlite_getAll(selectCheckSql, [id]);
        userCheckPromise.then((userCheckRes) => {
          if (userCheckRes[0].userExists == 0) {
            reject({ status: 404, message: "User not found for the given Id." });
          } else {
            //Faculty exist and no events found
            resolve({ status: 200, available: true });
          }
        });
      } else {
        for (let i = 0; i < results.length; i++) {
          //if user entry not present fail fast
          if (!results[i].userExist) {
            reject({ status: 404, message: "User not found for the given Id." });
          } else {
            if (!results[i].isRecurring) {
              //Faculty is busy, if non recurring event found
              resolve({ status: 200, available: false });
            } else {
              var isAvailable = true;
              if (!calUtil.checkAvailabilityByRecPattern(results[i].repeatPattern, startVal, endVal, results[i].start, results[i].end)) {
                resolve({ status: 200, available: false });
              }
            }
          }
        }

        //if no conflicts found return true
        resolve({ status: 200, available: true });
      }
    })
    .catch((err) => {
      reject({ status: 500, message: err.message });
    });
  });
}

//Fetch all Events
exports.getEvents = (table, colName, colValue, isSingleEvent) => {
  var queryParams = [];
  var query = 'SELECT * FROM ' + table;

  if (colName && colValue) {
    query = query + ' WHERE ' + colName + '=?';
    queryParams.push(colValue);
  }

  return new Promise(function (resolve, reject) {
    var dbPromise = dbHelper.sqlite_getAll(query, queryParams);
    dbPromise.then((events) => {
      if (events.length > 0) {
        if (isSingleEvent) {
          resolve({ status: 200, events: events[0] });
        } else {
          resolve({ status: 200, events: events });
        }
      } else {
        resolve({ status: 204, events: "No content." });
      }
    })
      .catch((err) => {
        reject({ status: 500, message: err.message });
      });
  });
}

//Insert Event
exports.insertEvent = (event) => {
  if (!Array.isArray(event)) {
    event = [event];
  }
  if (event.length > 0) {
    return new Promise((resolve, reject) => {

      event.forEach((eventItem) => {
        if (!calUtil.validateDate(eventItem.start, eventItem.end)) {
          reject({ status: 400, message: "Bad request. Invalid datetime." });
        }
      });

      var values = [];
      for (prop in Object.values(event)) {
        values.push(prop);
      }

      //multiple rows insert
      var insertSQL = 'INSERT INTO Event(';
      insertSQL += Object.keys(event[0]).join(',') + ') VALUES';
      var valuesSet = [];
      var queryVals = [];
      for (let i = 0; i < event.length; i++) {
        var eventVals = Object.values(event[i]);
        queryVals.push(...eventVals);
        if (eventVals.length == 1) {
          var valuesStr = '(?)';
          valuesSet.push(valuesStr);
        } else {
          var valuesStr = '(' + '?,'.repeat(Object.values(event[i]).length - 1) + '?)';
          valuesSet.push(valuesStr);
        }
      }
      insertSQL += valuesSet.join(",");

      var dbPromise = dbHelper.sqlite_run(insertSQL, queryVals);
      dbPromise.then((changes) => {
        if (changes <= 0) {
          resolve({ status: 204, message: "No content added." });
        } else {
          var updatedEvents = Array.prototype.map.call(event, s => s.id).toString();
          resolve({ status: 200, message: updatedEvents });
        }
      })
        .catch((err) => {
          reject({ status: 500, message: err.message });
        });
    });
  } else {
    reject({ status: 400, message: "Bad request. Invalid Event data." });
  }
}

//Insert User
exports.insertUser = (user) => {
  return new Promise((resolve, reject) => {
    var values = [];
    for (prop in Object.values(user)) {
      values.push(prop);
    }
    if (values.length > 0) {
      var insertSQL = 'INSERT INTO Faculty(';
      insertSQL += Object.keys(user).join(',') + ') VALUES(';
      if (values.length == 1) {
        insertSQL += '?)';
      } else {
        insertSQL += '?,'.repeat(Object.values(user).length - 1) + '?)';
      }

      var dbPromise = dbHelper.sqlite_run(insertSQL, Object.values(user));
      dbPromise.then((changes) => {
        if (changes <= 0) {
          resolve({ status: 204, message: "No content added." });
        } else {
          resolve({ status: 200, userId: user.id });
        }
      })
        .catch((err) => {
          reject({ status: 500, message: err.message });
        });
    }

  });
}

//Delete Event
exports.deleteEvent = (id, facultyId) => {
  return new Promise((resolve, reject) => {
    //Delete only if facultyId and eventId is given
    var deleteSQL = 'DELETE FROM Event WHERE id=? AND facultyId=?';
    var dbPromise = dbHelper.sqlite_run(deleteSQL, [id, facultyId]);
    dbPromise.then((changes) => {
      if (changes <= 0) {
        resolve({ status: 204, message: "No record found to delete." });
      } else {
        resolve({ status: 200, message: "Event deleted." });
      }
    })
      .catch((err) => {
        reject({ status: 500, message: err.message });
      });
  });
}

//Delete User
exports.deleteUser = (id) => {
  return new Promise((resolve, reject) => {
    var deleteSQL = 'DELETE FROM Faculty WHERE id=?';
    var dbPromise = dbHelper.sqlite_run(deleteSQL, [id]);
    dbPromise.then((changes) => {
      if (changes <= 0) {
        resolve({ status: 204, message: "No record found to delete." });
      } else {
        resolve({ status: 200, message: "User deleted." });
      }
    })
      .catch((err) => {
        reject({ status: 500, message: err.message });
      });
  });
}

//Update Event
exports.updateEvent = (event) => {
  return new Promise((resolve, response) => {
    if (!calUtil.validateDate(event.start, event.end)) {
      reject({ status: 400, message: "Bad request. Invalid datetime." });
    } else {
      //Update the event
      var updateSQL = 'UPDATE Event SET ';
      var keys = Object.keys(event);
      var vals = Object.values(event);
      for (let i = 0; i < keys.length; i++) {
        updateSQL += keys[i] + ' = ?';
        if (i != keys.length - 1) {
          updateSQL += ' , '
        }
      }
      //updated only if facultyId and eventId matches
      updateSQL += ' WHERE id = ? AND facultyId=? ';
      var dbPromise = dbHelper.sqlite_run(updateSQL, vals.concat(event['id'], event['facultyId']));
      dbPromise.then((changes) => {
        if (changes <= 0) {
          resolve({ status: 304, message: "No record found to update." });
        } else {
          resolve({ status: 200, message: "Event updated." });
        }
      })
        .catch((err) => {
          reject({ status: 500, message: err.message });
        });
    }
  });
}

//Update User
exports.updateUser = (user) => {
  return new Promise((resolve, reject) => {
    var updateSQL = 'UPDATE Faculty SET ';
    var keys = Object.keys(user);
    var vals = Object.values(user);
    for (let i = 0; i < keys.length; i++) {
      updateSQL += keys[i] + ' = ?';
      if (i != keys.length - 1) {
        updateSQL += ' , '
      }
    }
    updateSQL += ' WHERE id = ?';
    var dbPromise = dbHelper.sqlite_run(updateSQL, vals.concat(user['id']));
    dbPromise.then((changes) => {
      if (changes <= 0) {
        resolve({ status: 304, message: "No record found to update." });
      } else {
        resolve({ status: 200, userId: user.id });
      }
    })
      .catch((err) => {
        reject({ status: 500, message: err.message });
      });
  });
}

//Update WorkHours data
exports.updateUserWorkHours = (userWorkHoursData) => {
  return new Promise((resolve, reject) => {
    var values = Object.values(userWorkHoursData);
    if (!calUtil.validateDate(userWorkHoursData.start, userWorkHoursData.end)) {
      reject({ status: 400, message: "Bad request. Invalid datetime." });
    }

    if (values.length > 0) {
      var upsertSQL = 'REPLACE INTO WorkHours(';
      upsertSQL += Object.keys(userWorkHoursData).join(',') + ') VALUES(';
      if (values.length == 1) {
        upsertSQL += '?)';
      } else {
        upsertSQL += '?,'.repeat(Object.values(userWorkHoursData).length - 1) + '?)';
      }

      var dbPromise = dbHelper.sqlite_run(upsertSQL, Object.values(userWorkHoursData));
      dbPromise.then((changes) => {
        if (changes <= 0) {
          resolve({ status: 304, message: "No record found to update." });
        } else {
          resolve({ status: 200, facultyId: userWorkHoursData.id });
        }
      })
        .catch((err) => {
          reject({ status: 500, message: err.message });
        });
    }
  });
}


