var express = require('express');
var router = express.Router();
var sqliteDAO = require('./sqliteDAO');
var calUtil = require('./calUtil');

//GET - Events
router.get('/events', (req, res) => {
  //GET - Events of Specific Faculty
  if(req.query.facultyId){
    var facultyEventsPromise = sqliteDAO.getEvents("Event", "facultyId", req.query.facultyId);
    facultyEventsPromise.then((data) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.status(data.status).json({
          data: data.events
      });
    })
    .catch((err) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.status(err.status).json({
        Status: err.message
      });
    });
  } else { //GET - all Events
    var readPromise = sqliteDAO.getEvents("Event");
    readPromise.then((data) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.status(data.status).json({
          data: data.events
      });
    })
    .catch((err) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.status(err.status).json({
        Status: err.message
      });
    });
  }
});

//GET - Event
router.get('/events/:id', (req, res) => {
  if(!req.params.id){
    res.status(400).json({
      Status:'Bad request. Invalid Id.'
    });
  } else {
    var readPromise = sqliteDAO.getEvents("Event", "id", req.params.id, true);
    readPromise.then((data) => {
      res.status(data.status).json({
        data: data.events
    });
    })
    .catch((err) => {
      res.status(err.status).json({
        Status: err.message
      });
    });
  }
});

//POST - Event
router.post('/events', (req, res, next) => {
  var facultyId = req.query.facultyId;

  //faculty made mandatory as of now for every Event creation/update
  //faculty can be made optional so that we can assign faculty to event later anytime by creating connection table
  if(!facultyId){
    res.status(400).json({
      Status:'Bad request. Faculty id required.'
    });
  }

  //check if faculty is available before adding a event
  var availabilityPromise = sqliteDAO.getUserAvailability(facultyId, req.body.start, req.body.end);
  availabilityPromise.then((availablityResp) => {
    if(availablityResp.status == 200 && availablityResp.available){
      var eventData = calUtil.getEventObject(req, facultyId);
      //add Event only if faculty is available
      var insertPromise = sqliteDAO.insertEvent(eventData);
      insertPromise.then((data) => {
        res.status(data.status).json({
          status: data.status,
          id: data.message
        });
      })
      .catch((err) => {
        res.status(err.status).json({
          status: err.status,
          message: err.message
        });
      });
    } else {
      res.status(403).json({
        status: 403,
        message: "Faculty is not available for the given time."
      });
    }
  })
  .catch((err) => {
    res.status(err.status).json({
      status: err.status,
      Status: err.message
    });
  });
});

//PUT - Event
router.put('/events/:id', (req, res, next) => {
  var facultyId = req.query.facultyId;

  //faculty made mandatory as of now for every Event creation/update
  //faculty can be made optional so that we can assign faculty to event later anytime by creating connection table
  if(!facultyId){
    res.status(400).json({
      status: 400,
      message:'Bad request. Faculty id required.'
    });
  }

  if(!req.params.id){
    res.status(400).json({
      status: 400,
      message:'Bad request. Invalid Id.'
    });
  } else {
    //check if faculty is available before update. Exlude the current event in the check
    var availabilityPromise = sqliteDAO.getUserAvailability(facultyId, req.body.start, req.body.end, req.params.id);
    availabilityPromise.then((availablityResp) => {
      if(availablityResp.status == 200 && availablityResp.available){
        var eventData = calUtil.getEventObject(req, facultyId, req.params.id);
        eventData.id = req.params.id;
        //update Event only if faculty is available
        var updatePromise = sqliteDAO.updateEvent(eventData, facultyId);
        updatePromise.then((data) => {
          res.status(data.status).json({
            status: data.status,
            message: data.message
          });
        })
        .catch((err) => {
          res.status(err.status).json({
            status: err.status,
            message: err.message
          });
        });
      } else {
        res.status(403).json({
          status: 403,
          message: "Faculty is not available for the given time."
        });
      }
    })
    .catch((err) => {
      res.status(err.status).json({
        status: err.status,
        message: err.message
      });
    });
  }
});

//DELETE - Event
router.delete('/events/:id', (req, res) => {
  var facultyId = req.query.facultyId;

  //faculty made mandatory as of now 
  if(!facultyId){
    res.status(400).json({
      status: 400,
      message:'Bad request. Faculty id required.'
    });
  } else if(!req.params.id){
    res.status(400).json({
      status: 400,
      message:'Bad request. Invalid Id.'
    });
  } else {
    var deletePromise = sqliteDAO.deleteEvent(req.params.id, facultyId);
    deletePromise.then((data) => {
      res.status(data.status).json({
        status: data.status,
        message: data.message
      });
    })
    .catch((err) => {
      res.status(err.status).json({
        status: err.status,
        message: err.message
      });
    });
  }
});

//Delete all API is not provided purposely as it could be disastrous if all entries get deleted unknowingly.
//Can be created If it's necessary
module.exports = router;