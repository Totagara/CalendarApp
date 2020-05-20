import React, { useState, useEffect } from 'react';
import './App.css';
import { Inject, ScheduleComponent, ViewsDirective, ViewDirective, Day, Week, Month, Agenda } from '@syncfusion/ej2-react-schedule';
import { CalendarAdminBar } from './UserManagement';

function App() {
  const [events, setEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [usersList, setUsersList] = useState([]);

  var scheduleObj, currentEvent, currentSchedule;
  var domain = 'http://localhost:3000';

  useEffect(() => {
    var fetchPromise = fetchCurUser(currentUser);
    fetchPromise.then((curUser) => {
      setCurrentUser(curUser);
      fetchEvents(curUser);
    });
    console.log("Data fetched from server");
  }, [currentUser]);

  const fetchCurUser = (curUser) => {
    return new Promise((resolve, reject) => {
      if (curUser) {
        resolve(currentUser);
      } else {
        var usersPromise = fetchUsers();
        usersPromise.then((firstUser) => {
          resolve(firstUser);
        })
          .catch((err) => {
            console.log(err);
            reject(null);
          });
      }
    });
  }

  const fetchEvents = (curUser) => {
    fetch(domain + "/calendar/events?facultyId=" + curUser)
      .then(response => response.json())
      .then(resp => {
        if (resp && resp.data) {
          var events = generateEventsSource(resp.data);
          setEvents(events);
        }
      })
      .catch((err) => {
        console.log(err);
        setEvents([]);
      });
  }

  const fetchUsers = () => {
    return new Promise((resolve, reject) => {
      fetch(domain + "/users")
        .then(response => response.json())
        .then(resp => {
          if (resp && resp.data) {
            setUsersList(resp.data);
            resolve(resp.data[0].id);
          } else {
            reject("No users data available");
          }
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }

  const generateEventsSource = (eventsColl) => {
    var events = [];
    eventsColl.forEach(element => {
      var event = {};
      element.id && (event.Id = element.id);
      element.end && (event.EndTime = (new Date(element.end)).toString())
      element.start && (event.StartTime = (new Date(element.start)).toString())
      element.subject && (event.Subject = element.subject)
      element.location && (event.Location = element.location)
      element.description && (event.Description = element.description)
      element.isRecurring && (event.Repeat = true)
      element.repeatPattern && (event.RecurrenceRule = element.repeatPattern)
      events.push(event);
    });
    return events;
  }

  const getEventObject = (eventData) => {
    var event = {};
    eventData.id && (event.id = eventData.id);
    eventData.EndTime && (event.end = (new Date(eventData.EndTime)).toString())
    eventData.StartTime && (event.start = (new Date(eventData.StartTime)).toString())
    eventData.Subject && (event.subject = eventData.Subject)
    eventData.Location && (event.location = eventData.Location)
    eventData.Description && (event.description = eventData.Description)
    eventData.RecurrenceRule && (event.isRecurring = true)
    eventData.RecurrenceRule && (event.repeatPattern = eventData.RecurrenceRule)
    return event;
  }

  const validateDates = (startDateVal, endDateVal) => {
    var isValid = true;

    if (startDateVal == null || endDateVal == null || isNaN(Date.parse(startDateVal)) || isNaN(Date.parse(endDateVal))) {
      alert("Invalid Date format.");
      isValid = false;
    }

    if (new Date(startDateVal) > new Date(endDateVal)) {
      alert("Start date should not be greater than end date.");
      isValid = false;
    }
    return isValid;
  }

  const addEventToServer = (eventData, currentSchedule) => {
    if (validateDates(eventData.StartTime, eventData.EndTime)) {
      var eventObj = getEventObject(eventData);
      var eventBody = JSON.stringify(eventObj);
      fetch(domain + "/calendar/events?facultyId=" + currentUser, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: eventBody
      })
        .then(res => res.json())
        .then((resp) => {
          if (resp.status == 403) {
            alert("Faculty not available for the selected date-time.");
          } else if (resp.status == 200) {
            eventData.Id = resp.id;
            currentSchedule.addEvent(eventData);
          }
        })
        .catch((err) => {
          console.log("Error: " + err);
        });
      dialogClose();
    }
  }

  const deleteEventInServer = (eventData) => {
    var id = eventData.Id;
    fetch(domain + '/calendar/events/' + id + "?facultyId=" + currentUser, {
      method: 'DELETE',
    })
      .then(res => res.json())
      .then((resp) => {
        if (resp && resp.status == 400) {
          alert(resp.message);
        } else if (resp && resp.status == 200) {
          currentSchedule.deleteEvent(eventData);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  const updateEventToServer = (eventData, currentSchedule) => {
    if (validateDates(eventData.StartTime, eventData.EndTime)) {
      var id = currentEvent.Id;
      var eventObj = getEventObject(eventData);
      eventObj.id = id;
      eventData.Id = id;
      var eventBody = JSON.stringify(eventObj);
      fetch(domain + '/calendar/events/' + id + "?facultyId=" + currentUser, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: eventBody
      })
        .then((res) => {
          if (res.status == 403) {
            alert("Faculty not available for the selected date-time.");
          } else {
            currentSchedule.saveEvent(eventData);
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }

  const addSyncfusionScheduler = () => {
    return (<div>
      <ScheduleComponent currentView='Week'
        ref={schedule => scheduleObj = schedule}
        eventSettings={{ dataSource: events }}
        showQuickInfo={false}
        popupOpen={openPopUp.bind(this)} >
        <ViewsDirective>
          <ViewDirective option='Day' />
          <ViewDirective option='Week' />
          <ViewDirective option='Month' />
        </ViewsDirective>
        <Inject services={[Day, Week, Month, Agenda]} />
      </ScheduleComponent>
    </div>)
  }

  const openPopUp = (args) => {
    if (args.type == 'RecurrenceAlert') {
      //Disabled editing single occurence of recurring event for this assignment
      document.getElementsByClassName("e-quick-dialog-occurrence-event")[0].ej2_instances[0].disabled = true;
    }

    if (args.type === 'Editor' || args.type === 'QuickInfo') {
      currentSchedule = scheduleObj;
      currentEvent = args.type === 'QuickInfo' ? scheduleObj.getEventDetails(args.target) : args.data;
      let dialogObj = (args.element).ej2_instances[0];
      let buttons;

      //hide timezone and all day fields for now.
      document.querySelector('.e-all-day-container').hidden = true;
      document.querySelector('.e-time-zone-container').hidden = true;
      if (args.target.classList.contains('e-appointment')) {
        buttons = [{
          buttonModel: { content: 'SAVE', isPrimary: true }, click: editEvent.bind(this)
        }, {
          buttonModel: { content: 'DELETE', cssClass: 'e-event-delete' }, click: eventDelete.bind(this)
        },
        {
          buttonModel: { content: 'CANCEL', cssClass: 'e-event-cancel' }, click: dialogClose.bind(this)
        }];
      } else {
        buttons = [{
          buttonModel: { content: 'SAVE', isPrimary: true }, click: eventAdd.bind(this)
        }, {
          buttonModel: { content: 'CANCEL', cssClass: 'e-event-cancel' }, click: dialogClose.bind(this)
        }];
      }
      dialogObj.buttons = buttons;
      dialogObj.dataBind();
    }
  }

  const eventDelete = (e) => {
    const eventData = currentSchedule.activeEventData.event;
    deleteEventInServer(eventData, currentSchedule);
    dialogClose();
  }

  const eventAdd = (e) => {
    const eventData = currentSchedule.eventWindow.getObjectFromFormData('e-schedule-dialog');
    eventData.RecurrenceRule = document.querySelector('.e-recurrenceeditor').ej2_instances[0].value;
    addEventToServer(eventData, currentSchedule);
    dialogClose();
  }

  const editEvent = (e) => {
    const eventData = currentSchedule.eventWindow.getObjectFromFormData('e-schedule-dialog');
    eventData.RecurrenceRule = document.querySelector('.e-recurrenceeditor').ej2_instances[0].value;
    updateEventToServer(eventData, currentSchedule);
    dialogClose();
  }
  const dialogClose = () => {
    let dialogObj = (document.querySelector('.e-schedule-dialog')).ej2_instances[0];
    dialogObj.hide();
  }

  return (
    <>
      <CalendarAdminBar currentUser={currentUser} setCurrentUser={setCurrentUser} usersList={usersList} setUsersList={setUsersList} />
      <div>{addSyncfusionScheduler()}</div>
    </>
  );
}

export default App;
