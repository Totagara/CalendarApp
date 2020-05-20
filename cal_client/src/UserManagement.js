import React, {useRef } from "react";
import "./App.css";
import Button from "@material-ui/core/Button";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import TextField from "@material-ui/core/TextField";
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
}));

export const CalendarAdminBar = ({ currentUser, setCurrentUser, usersList, setUsersList }) => {
  return (
    <>
      <UserDropDown
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        usersList={usersList}
      />
      <AddUser usersList={usersList} setUsersList={setUsersList}  setCurrentUser={setCurrentUser}/>
      <AddWorkHours currentUser={currentUser} />
    </>
  );
};

const UserDropDown = ({ currentUser, setCurrentUser, usersList }) => {
  const classes = useStyles();
  const handleSelectionChange = (e) => {
    setCurrentUser(e.target.value);
  }

  return (
    <div className="App">
      <FormControl className={classes.formControl}>
        <InputLabel htmlFor="grouped-native-select">Current User</InputLabel>
        <Select native defaultValue="" id="grouped-native-select"
          onChange={handleSelectionChange}
        >
          {usersList.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </Select>
      </FormControl>
    </div>
  );
};

const AddUser = ({ usersList, setUsersList, setCurrentUser }) => {
  const name = useRef("");
  const email = useRef("");
  const phone = useRef("");
  const location = useRef("");
  const classes = useStyles();

  //Add new user
  const addNewUser = (userObj) => {
    var userBody = JSON.stringify(userObj);
    fetch('http://localhost:3000/users', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: userBody
    })
      .then(res => res.json())
      .then((res) => {
        userObj.id = res.userId;
        setUsersList([...usersList, userObj]);
        setCurrentUser(res.userId);
      })
      .catch((err) => {
        console.log("Error: " + err);
      });
  }

  const closeDialog = (className) => {
    var popUp = document.getElementsByClassName(className)[0];
    if (popUp) {
      popUp.style.display = "none";
      name.current.value = '';
      email.current.value = '';
      phone.current.value = '';
      location.current.value = '';
    }
  }

  return (
    <div>
      <FormControl className={classes.formControl}>
        <Button
          color="primary"
          variant="contained"
          style={{ justifyContent: "center" }}
          onClick={() => {
            var addUserPopUp = document.getElementsByClassName("modal")[0];
            addUserPopUp.style.display = "block";
          }}
        >
          Add user
        </Button>
      </FormControl>
      <div id="addUserDialog" class="modal addUser">
        <div class="modal-content">
          <div>
            <InputLabel htmlFor="grouped-native-select">
              User Details:
            </InputLabel>
            <FormControl className={classes.formControl}>
              <TextField key="name" label="Name" inputRef={name} />
              <TextField key="email" label="Email" inputRef={email} />
              <TextField key="phone" label="Phone" inputRef={phone} />
              <TextField key="location" label="Location" inputRef={location} />
            </FormControl>
          </div>
          <Button
            color="primary"
            onClick={() => {
              closeDialog("addUser");
            }}
          >
            Close
          </Button>
          <Button
            color="primary"
            onClick={(e) => {
              e.preventDefault();
              var userObj = {};
              userObj.name = name.current.value;
              userObj.email = email.current.value;
              userObj.phone = phone.current.value;
              userObj.location = location.current.value;
              addNewUser(userObj);
              closeDialog("addUser");
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

const AddWorkHours = ({ currentUser }) => {
  const classes = useStyles();

  //check box states
  const [state, setState] = React.useState({
    checkedSun: false,
    checkedMon: true,
    checkedTue: true,
    checkedWed: true,
    checkedThu: true,
    checkedFri: true,
    checkedSat: false,
  });

  const handleCheckBoxChange = (event) => {
    setState({ ...state, [event.target.name]: event.target.checked });
  };

  //References for Checkboxes
  const checkedSunRef = useRef(state.checkedSun);
  const checkedMonRef = useRef(state.checkedMon);
  const checkedTueRef = useRef(state.checkedTue);
  const checkedWedRef = useRef(state.checkedWed);
  const checkedThuRef = useRef(state.checkedThu);
  const checkedFriRef = useRef(state.checkedFri);
  const checkedSatRef = useRef(state.checkedSat);
  const startTimeTextField = useRef("");
  const endTimeTextField = useRef("");
  const blockerNote = useRef("");

  const closeWorkHoursDialog = (className) => {
    var popUp = document.getElementsByClassName(className)[0];
    if (popUp) {
      popUp.style.display = "none";
      blockerNote.current.value = '';
    }
  }

  //Update work Hours for User
  const updateWorkHours = (workHoursObj) => {
    if (currentUser) {
      var workHoursBody = JSON.stringify(workHoursObj);
      fetch('http://localhost:3000/users/workhours/' + currentUser, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: workHoursBody
      })
        .then((res) => {
          console.log("User work hours updated.");
        })
        .catch((err) => {
          console.log("Error during User work hours updatation. Err: " + err);
        });
    } else {
      alert("User not selected");
    }
  }

  return (
    <div>
      <FormControl className={classes.formControl}>
        <Button
          color="primary"
          variant="contained"
          style={{ justifyContent: "center" }}
          onClick={() => {
            var addWorkHoursPopup = document.getElementsByClassName("addWorkHours")[0];
            addWorkHoursPopup.style.display = "block";
          }}
        >
          Add Work hours
        </Button>
      </FormControl>
      <div id="addWorkHoursDialog" class="modal addWorkHours">
        <div class="modal-content">
          <div>
            <InputLabel htmlFor="grouped-native-select">
              User Work hours Details:
            </InputLabel>
            <FormControl className={classes.formControl}>
              <FormControl className={classes.formControl}>
                <form class="clock-textField clock-container" noValidate>
                  <TextField
                    inputRef={startTimeTextField}
                    id="startTime"
                    label="Start time"
                    type="time"
                    defaultValue="08:00"
                    className={classes.textField}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    inputProps={{
                      step: 300, // 5 min
                    }}
                  />
                </form>
                <form class="clock-textField clock-container" noValidate>
                  <TextField
                    inputRef={endTimeTextField}
                    id="endTime"
                    label="End time"
                    type="time"
                    defaultValue="05:00"
                    className={classes.textField}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    inputProps={{
                      step: 300, // 5 min
                    }}
                  />
                </form>
                <TextField key="blockerNote" label="Blocker note" inputRef={blockerNote} />
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={checkedSunRef}
                      checked={state.checkedSun}
                      onChange={handleCheckBoxChange}
                      name="checkedSun"
                      color="primary"
                    />
                  }
                  label="Sunday"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={state.checkedMon}
                      onChange={handleCheckBoxChange}
                      inputRef={checkedMonRef}
                      name="checkedMon"
                      color="primary"
                    />
                  }
                  label="Monday"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={checkedTueRef}
                      name="checkedTue"
                      color="primary"
                    />
                  }
                  label="Tuesday"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={checkedWedRef}
                      name="checkedWed"
                      color="primary"
                    />
                  }
                  label="Wednesday"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={checkedThuRef}
                      name="checkedThu"
                      color="primary"
                    />
                  }
                  label="Thursday"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={checkedFriRef}
                      name="checkedFri"
                      color="primary"
                    />
                  }
                  label="Friday"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={checkedSatRef}
                      name="checkedSat"
                      color="primary"
                    />
                  }
                  label="Saturday"
                />
              </FormControl>
            </FormControl>
          </div>
          <Button
            color="primary"
            onClick={() => {
              var modalPopUp = document.getElementsByClassName("addWorkHours")[0];
              modalPopUp.style.display = "none";
            }}
          >
            Close
          </Button>
          <Button
            color="primary"
            onClick={(e) => {
              e.preventDefault();
              var workHoursObj = {};
              var days = [];
              (checkedSunRef.current.checked) && (days.push("SU"));
              (checkedMonRef.current.checked) && (days.push("MO"));
              (checkedTueRef.current.checked) && (days.push("TU"));
              (checkedWedRef.current.checked) && (days.push("WE"));
              (checkedThuRef.current.checked) && (days.push("TH"));
              (checkedFriRef.current.checked) && (days.push("FR"));
              (checkedSatRef.current.checked) && (days.push("SA"));

              //Start date time value
              var curDate = new Date();
              var startTimeVal = startTimeTextField.current.value;
              curDate.setHours(startTimeVal.split(":")[0]);
              curDate.setMinutes(startTimeVal.split(":")[1]);
              curDate.setSeconds(0);
              workHoursObj.start = curDate.toISOString();

              //Start date time value
              var endTimeValue = endTimeTextField.current.value;
              curDate.setHours(endTimeValue.split(":")[0]);
              curDate.setMinutes(endTimeValue.split(":")[1]);
              curDate.setSeconds(0);
              workHoursObj.end = curDate.toISOString();
              var freqPattern = "FREQ=WEEKLY;";
              if (days.length == 0 || !workHoursObj.start || !workHoursObj.end) {
                alert("Valid work hours days and time is required.");
              } else {
                var daysPattern = "BYDAY=" + days.join(",") + ";";
                var intervalPattern = "INTERVAL=1;";
                workHoursObj.pattern = freqPattern + daysPattern + intervalPattern;
                workHoursObj.blockerNote = blockerNote.current.value;
                updateWorkHours(workHoursObj);
                closeWorkHoursDialog("addWorkHours");
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};
