var express = require('express');
var router = express.Router();
var sqliteDAO = require('./sqliteDAO');
var calUtil = require('./calUtil');

//GET - Users
router.get('/', (req, res) => {
  var readUsersPromise = sqliteDAO.getUsers();
  readUsersPromise.then((data) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.status(data.status).json({
      data: data.users
    });
  })
    .catch((err) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.status(err.status).json({
        Status: err.message
      });
    });
});

//GET - User
router.get('/:id', (req, res) => {
  if (!req.params.id) {
    res.status(400).json({
      Status: 'Bad request. Invalid Id.'
    });
  } else {


    var readPromise = sqliteDAO.getUsers("id", req.params.id);
    readPromise.then((data) => {
      res.status(data.status).json({
        data: data.users
      });
    })
      .catch((err) => {
        res.status(err.status).json({
          Status: err.message
        });
      });


  }
});

//POST - User
router.post('/', (req, res, next) => {
  var userData = calUtil.getUserObject(req, true);
  var insertUserPromise = sqliteDAO.insertUser(userData);
  insertUserPromise.then((data) => {
    res.status(data.status).json({
      status: data.status,
      userId: data.userId
    });
  })
    .catch((err) => {
      res.status(err.status).json({
        status: err.status,
        message: err.message
      });
    });
});

//DELETE - User
router.delete('/:id', (req, res) => {
  if (!req.params.id) {
    res.status(400).json({
      Status: 'Bad request. Invalid Id.'
    });
  } else {
    var deletePromise = sqliteDAO.deleteUser(req.params.id);
    deletePromise.then((data) => {
      res.status(data.status).json({
        Status: data.message
      });
    })
      .catch((err) => {
        res.status(err.status).json({
          Status: err.message
        });
      });
  }
});

//PUT - User
router.put('/:id', (req, res, next) => {
  if (!req.params.id) {
    res.status(400).json({
      Status: 'Bad request. Invalid Id.'
    });
  } else {
    var userData = calUtil.getUserObject(req);
    userData.id = req.params.id;
    var updatePromise = sqliteDAO.updateUser(userData);
    updatePromise.then((data) => {
      res.status(data.status).json({
        Status: data.userId
      });
    })
      .catch((err) => {
        res.status(err.status).json({
          Status: err.message
        });
      });
  }
});

//GET user Availability
router.get('/availability/:id', (req, res, next) => {
  var readPromise = sqliteDAO.getUserAvailability(req.params.id, req.query.start, req.query.end, req.query.excludeIds);
  readPromise.then((data) => {
    res.status(data.status).json({
      available: data.available
    });
  })
    .catch((err) => {
      res.status(err.status).json({
        Status: err.message
      });
    });
});

//POST - add/update user work hours details
router.post('/workhours/:id', (req, res, next) => {
  //validate datetime
  if (!calUtil.validateDate(req.body.start, req.body.start)) {
    res.status(400).json({
      message: "Bad request. Invalid datetime."
    });
  }
  if (!req.params.id) {
    res.status(400).json({
      Status: 'Bad request. Faculty Id required.'
    });
  } else {


    //check if user exists before update
    var readPromise = sqliteDAO.getUsers("id", req.params.id);
    readPromise.then((userExistsData) => {


      if (userExistsData.status == 204) {
        res.status(403).json({
          status: 403,
          message: "Faculty is not available."
        });
      } else {


        var userWorkHoursData = calUtil.getUserWorkHoursObject(req);
        userWorkHoursData.facultyId = req.params.id;
        //create blocker event for working and non working days
        var blockerEvents = calUtil.getBlockerEvents(userWorkHoursData);
        var insertEventPromise = sqliteDAO.insertEvent(blockerEvents);
        insertEventPromise.then((insertResp) => {
          //Bad code - to be corrected: ideally either transactions or triggers should be used for this scenario

          //update blockerEvents ids
          userWorkHoursData.blockerEvents = insertResp.message;
          var updateWorkHoursPromise = sqliteDAO.updateUserWorkHours(userWorkHoursData);
          updateWorkHoursPromise.then((data) => {
            console.log(insertResp.message);
            res.status(data.status).json({
              Status: data.facultyId
            });
          })
            .catch((err) => {
              res.status(err.status).json({
                Status: err.message
              });
            });


        })
        .catch ((insertErr) => {
          res.status(insertErr.status).json({
            Status: insertErr.message
          });
        });
      }
    })
      .catch((userErr) => {
        res.status(userErr.status).json({
          Status: userErr.message
        });
      });


    
      



  }




});

module.exports = router;