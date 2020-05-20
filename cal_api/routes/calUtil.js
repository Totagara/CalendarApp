var uuid = require('uuid');
var moment = require('moment-recur');

//validate datetime fields
exports.validateDate = (startDate, endDate) => {
  if( startDate == null ||  endDate == null || isNaN(Date.parse(startDate)) ||  isNaN(Date.parse(endDate)) ){
    return false;
  }
  return true;
}

//get Event object from request data
exports.getEventObject = (req, facultyId, withId) => {
  var event = {};
  facultyId && (event.facultyId = facultyId)
  //create new id for POST. Use existing id for PUT
  event.id = withId? withId : uuid.v1().replace(/-/g,"");
  req.body.end && (event.end = (new Date(req.body.end)).toISOString())
  req.body.start && (event.start = (new Date(req.body.start)).toISOString())
  req.body.subject && (event.subject = req.body.subject)
  req.body.location && (event.location = req.body.location)
  req.body.description && (event.description = req.body.description)
  req.body.isRecurring && (event.isRecurring = req.body.isRecurring)
  req.body.repeatPattern && (event.repeatPattern = req.body.repeatPattern)
  return event;
}

//get User object from request data
exports.getUserObject = (req, withId) => {
  var user = {};
  withId && (user.id = uuid.v1().replace(/-/g,""))
  req.body.name && (user.name = req.body.name)
  req.body.email && (user.email = req.body.email)
  req.body.phone && (user.phone = req.body.phone)
  req.body.location && (user.location = req.body.location)
  return user;
}

//get UserWorkHours object from request data
exports.getUserWorkHoursObject = (req) => {
  var userWorkHoursData = {};
  userWorkHoursData.facultyId = req.params.id;
  userWorkHoursData.id = uuid.v1().replace(/-/g,"");
  req.body.start && (userWorkHoursData.start = (new Date(req.body.start)).toISOString())
  req.body.end && (userWorkHoursData.end = (new Date(req.body.end)).toISOString())
  req.body.pattern && (userWorkHoursData.pattern = req.body.pattern)
  req.body.blockerNote && (userWorkHoursData.blockerNote = req.body.blockerNote)
  return userWorkHoursData;
}

exports.getBlockerEvent = (userWorkHoursData, facultyId)=> {
  var event = {};
  event.id = userWorkHoursData.id;

  //swap start and end date for blocker
  event.start = new Date(userWorkHoursData.end).toISOString();
  event.end = new Date(userWorkHoursData.start).toISOString();
  event.subject = userWorkHoursData.blockerNote;
  event.isRecurring = 1;
  event.repeatPattern = userWorkHoursData.pattern;
  event.facultyId = userWorkHoursData.facultyId;
  return event;
}

exports.getBlockerEvents = (userWorkHoursData, facultyId)=> {
  var events = [];

  //working day blocker
  //events.push(getWorkingDaysBlocker(userWorkHoursData));
  events = getWorkingDaysBlocker(userWorkHoursData);

  //non-working day blocker
  var offDays = getNonWorkingDays(userWorkHoursData.pattern);
  events.push(getNonWorkingDaysBlocker(userWorkHoursData, offDays));
  return events;
}

const getDaysFromPattern = (days) => {
  var dayNames = [];
  if(days){
    days.includes("SU") && (dayNames.push("Sunday"));
    days.includes("MO") && (dayNames.push("Monday"));
    days.includes("TU") && (dayNames.push("Tuesday"));
    days.includes("WE") && (dayNames.push("WednesDay"));
    days.includes("TH") && (dayNames.push("Thursday"));
    days.includes("FR") && (dayNames.push("Friday"));
    days.includes("SA") && (dayNames.push("Saturday"));
  }
  return dayNames;
}

const getRecurrenceParts = (repeatPattern) => {
  var recParts = {};
  if(repeatPattern){
    var parts = repeatPattern.split(";");
    parts.forEach((val) => {
      if(val.startsWith("FREQ")){
        recParts.freq = val.split("=")[1];
      } 
      else if(val.startsWith("INTERVAL")){
        recParts.interval = parseInt(val.split("=")[1]);
      } 
      else if(val.startsWith("BYDAY")){
        recParts.byDay = val.split("=")[1].split(",");
      } 
      else if(val.startsWith("BYMONTHDAY")){
        recParts.byMonthDay = parseInt(val.split("=")[1]);
      } 
      else if(val.startsWith("BYSETPOS")){
        recParts.bySetPos = parseInt(val.split("=")[1]);
      } 
      else if(val.startsWith("BYMONTH")){
        recParts.byMonth = parseInt(val.split("=")[1]);
      } else if(val.startsWith("UNTIL")){
        var untilText = val.split("=")[1];
        //format the recurrence Until date field string to standard Date format
        var untilDate = new Date(untilText.substring(0,4) + "-" + untilText.substring(4,6) + "-" + untilText.substring(6,11) + ":" + untilText.substring(11,13)+ ":" + untilText.substring(13));
        recParts.until = untilDate.toISOString();
      } else if(val.startsWith("COUNT")){
        recParts.count = parseInt(val.split("=")[1]);
      }
    });
    return recParts;
  }
}  

const getMonthName = (month) => {
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if(month > 0 && month <= 12){
      return months[month-1];
    }
    return "";
}

exports.checkAvailabilityByRecPattern = (repeatPattern, req_start, req_end, record_start, record_end) => {
  //if recurrence cycle starting after the requested datetime
  if(new Date(req_start) < new Date(record_start) && new Date(req_end) < new Date(record_end)){
    return true;
  }
  var recStartDate = new Date(record_start);
  var recEndDate = new Date(record_end);
  var reqStartDate = new Date(req_start);
  var reqEndDate = new Date(req_end);
  var recParts = getRecurrenceParts(repeatPattern);
  if(Object.values(recParts).length > 0 && recParts.freq){
    var freqType = recParts.freq;
    //create recurrence matcher based on the start and end date
    //If recurrence has end date
    if(recParts.until){
      var recEnding = new Date(recParts.until);
      var dateMatcher = moment().recur(recStartDate.toLocaleDateString(), recEnding.toLocaleDateString());
    } else {
      var dateMatcher = moment(recStartDate.toLocaleDateString()).recur();
    }

    if(freqType == 'DAILY'){
      /* Daily
      "FREQ=DAILY;INTERVAL=1;UNTIL=20200712T083000Z;" */
      dateMatcher = recParts.interval?dateMatcher.every(recParts.interval).days() : dateMatcher;
    } else if(freqType == 'WEEKLY'){
      /* Weekly - possibilities
      "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;INTERVAL=1;UNTIL=20200711T183000Z;"
      "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;INTERVAL=1;COUNT=10;"
      "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;INTERVAL=1;" */
      var days = getDaysFromPattern(recParts.byDay);
      dateMatcher = days.length>0? dateMatcher.every(days).daysOfWeek() : dateMatcher;

      //to be addressed - not working
      //interval for weeks not working with moment-recur library 
      //dateMatcher = recParts.interval? dateMatcher.every(recParts.interval).weeks() : dateMatcher;
    } else if(freqType == 'MONTHLY'){
      /* Monthly - possibilities
      "FREQ=MONTHLY;BYMONTHDAY=12;INTERVAL=1;UNTIL=20200711T213000Z;”
      "FREQ=MONTHLY;BYMONTHDAY=12;INTERVAL=1;COUNT=10;
      "FREQ=MONTHLY;BYMONTHDAY=12;INTERVAL=1;”
      "FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2;INTERVAL=1;UNTIL=20200711T233000Z;"
      "FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2;INTERVAL=1;COUNT=10;"
      "FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2;INTERVAL=1;"
      */
      dateMatcher = recParts.byMonthDay? dateMatcher.every(recParts.byMonthDay).daysOfMonth() : dateMatcher;
      var days = getDaysFromPattern(recParts.byDay);
      dateMatcher = days.length>0 && recParts.bySetPos? dateMatcher.every(days).daysOfWeek().every(recParts.bySetPos).weeksOfMonthByDay() : dateMatcher;
      dateMatcher = recParts.interval? dateMatcher.every(recParts.interval).months() : dateMatcher;
    } else if(freqType == 'YEARLY'){
      /* Yearly - possibilities
      "FREQ=YEARLY;BYMONTHDAY=12;BYMONTH=5;INTERVAL=1;UNTIL=20200712T013000Z;”
      "FREQ=YEARLY;BYDAY=TU;BYSETPOS=2;BYMONTH=5;INTERVAL=1;COUNT=10;
      "FREQ=YEARLY;BYDAY=TU;BYSETPOS=2;BYMONTH=5;INTERVAL=1;" */
      dateMatcher = recParts.byMonthDay? dateMatcher.every(recParts.byMonthDay).daysOfMonth() : dateMatcher;
      dateMatcher = recParts.byMonth? dateMatcher.every(getMonthName(recParts.byMonth)).monthsOfYear() : dateMatcher;
      dateMatcher = recParts.interval? dateMatcher.every(recParts.interval).years() : dateMatcher;
      var days = getDaysFromPattern(recParts.byDay);
      dateMatcher = days.length>0 && recParts.bySetPos? dateMatcher.every(days).daysOfWeek().every(recParts.bySetPos).weeksOfMonthByDay() : dateMatcher;
    } 

    //if recurrence has count
    if(recParts.count){
      var possibleDates = dateMatcher.next(recParts.count, "L");
      possibleDates.forEach((val) => {
        if(new Date(val).toLocaleDateString().includes(reqStartDate.toLocaleDateString()) ||   
        new Date(val).toLocaleDateString().includes(reqEndDate.toLocaleDateString())){
          return false;
        }
      }); 
      return true;
    } else { // else check for for ever
      return !(dateMatcher.matches(reqStartDate.toLocaleDateString()) || dateMatcher.matches(reqEndDate.toLocaleDateString()));
    }
  }
  return true;
}

//create working days blocker for non working hours 
/* const getWorkingDaysBlocker = (userWorkHoursData) => {
  var event = {};
  event.id = uuid.v1().replace(/-/g,"");

  //get start and end date for blocker reverse update
  var sDate = new Date(userWorkHoursData.start);
  var eDate = new Date(userWorkHoursData.end);
  var startDateDay = sDate.getDate();
  var endDateDay = eDate.getDate();

  sDate.setDate(startDateDay > endDateDay?startDateDay : endDateDay);
  eDate.setDate(startDateDay < endDateDay?startDateDay : endDateDay);

  //swap start and end date for blocker
  //var startDateVal = new Date(userWorkHoursData.end);
  //event.start = startDateVal.toISOString();
  event.start = eDate.toISOString();

  //set end date to same as startDate as UTC time might goto previous day
  //var endDateVal = new Date(userWorkHoursData.start);
  //var endDateVal = new Date(userWorkHoursData.sDate);
  //endDateVal.setDate(startDateVal.getDate());
  //event.end = endDateVal.toISOString();
  //event.end = new Date(userWorkHoursData.start).toISOString();
  event.end = sDate.toISOString();
  
  event.subject = userWorkHoursData.blockerNote;
  event.description = userWorkHoursData.blockerNote;
  event.isRecurring = 1;
  event.repeatPattern = userWorkHoursData.pattern;
  event.facultyId = userWorkHoursData.facultyId;
  return event;
} */

const getWorkingDaysBlocker = (userWorkHoursData) => {
  var events = [];
  var event = {};
  event.id = uuid.v1().replace(/-/g,"");

  //get start and end date for blocker reverse update
  var sDate = new Date(userWorkHoursData.start);
  var eDate = new Date(userWorkHoursData.end);

  var dayStartTime = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), 0,0,0);
  //dayStartTime.setHours(0,0,0,0);
  var dayEndTime = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23,59,59);
  //dayEndTime.setHours(23,59,59,999);

  event.subject = userWorkHoursData.blockerNote;
  event.description = userWorkHoursData.blockerNote;
  event.isRecurring = 1;
  event.repeatPattern = userWorkHoursData.pattern;
  event.facultyId = userWorkHoursData.facultyId;

  //day start time to work hours start time
  if(sDate.getTime() - dayStartTime.getTime() > 0){
    var startEvent = Object.assign({}, event);
    startEvent.start = dayStartTime.toISOString();
    startEvent.end = sDate.toISOString();
    events.push(startEvent);
  }

  //work hours end time to day end time
  if(dayEndTime.getTime() - eDate.getTime() > 0){
    var endEvent = Object.assign({}, event);
    endEvent.start = eDate.toISOString();
    endEvent.end = dayEndTime.toISOString();
    endEvent.id = uuid.v1().replace(/-/g,"");
    events.push(endEvent);
  }
  return events;
}

//create non working days blocker for whole day
const getNonWorkingDaysBlocker = (userWorkHoursData, offDays) => {
  //Order of properties should be same as workingBlocker event object - for rows insert
  var event = {};
  event.id = uuid.v1().replace(/-/g,"");

  event.subject = userWorkHoursData.blockerNote;
  event.description = userWorkHoursData.blockerNote;
  event.isRecurring = 1;

  var nonworkingPattern = "FREQ=WEEKLY;BYDAY=" + offDays.join(",") +";INTERVAL=1";
  event.repeatPattern = nonworkingPattern;
   
  event.facultyId = userWorkHoursData.facultyId;

  //start
  var startDate = new Date();
  startDate.setHours(0);
  startDate.setMinutes(0);
  startDate.setSeconds(0);
  event.start = startDate.toISOString();

  //end
  var endDate = new Date();
  endDate.setHours(24);
  endDate.setMinutes(0);
  endDate.setSeconds(0);
  event.end = endDate.toISOString();
  return event;
}

//find non working days from Work hours pattern
const getNonWorkingDays = (daysPattern) => {
  var parts = daysPattern.split(";");
  var index = parts.findIndex((part) => part.startsWith("BYDAY"));
  workingDays = parts[index].split("=")[1].split(",");
  var regularDays = ['SU','MO','TU','WE','TH','FR','SA'];
  var offDays = [];
  regularDays.forEach((day) => {
    if(!workingDays.includes(day)){
      offDays.push(day);
    }
  });
  return offDays;
}


