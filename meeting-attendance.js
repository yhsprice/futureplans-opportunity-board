const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();

let activeCoaches = [];
let meetings = [];

async function loadPayPeriods() {
  const select = document.getElementById("payPeriodID");

  const response = await fetch(`${API_URL}?action=getPayPeriods`);
  const payPeriods = await response.json();

  select.innerHTML = `<option value="">Select Pay Period</option>`;

  payPeriods.forEach(period => {
    const option = document.createElement("option");
    option.value = period.PayPeriodID;
    option.textContent = `${period.PayPeriodID} | ${formatDateOnly(period.StartDate)} - ${formatDateOnly(period.EndDate)} | ${period.Status}`;
    select.appendChild(option);
  });
}

async function loadCoaches() {
  const response = await fetch(`${API_URL}?action=getPeople`);
  const people = await response.json();

  activeCoaches = people
    .filter(person =>
      person.Name &&
      String(person.Role || "").trim() !== "Manager"
    )
    .sort((a, b) => a.Name.localeCompare(b.Name));
}

async function createMeeting() {
  const meetingName = document.getElementById("meetingName").value.trim();
  const meetingDate = document.getElementById("meetingDate").value;
  const payPeriodID = document.getElementById("payPeriodID").value;
  const programType = document.getElementById("programType").value;
  const payRule = document.getElementById("payRule").value;
  const hours = document.getElementById("hours").value;
  const fund = document.getElementById("fund").value;
  const notes = document.getElementById("meetingNotes").value.trim();
  const message = document.getElementById("meetingMessage");

  if (!meetingName || !meetingDate || !payPeriodID || !programType || !payRule || !hours || !fund) {
    message.textContent = "Please complete all meeting fields.";
    return;
  }

  const url = `${API_URL}?action=addMeeting`
    + `&meetingName=${encodeURIComponent(meetingName)}`
    + `&meetingDate=${encodeURIComponent(meetingDate)}`
    + `&payPeriodID=${encodeURIComponent(payPeriodID)}`
    + `&programType=${encodeURIComponent(programType)}`
    + `&payRule=${encodeURIComponent(payRule)}`
    + `&hours=${encodeURIComponent(hours)}`
    + `&fund=${encodeURIComponent(fund)}`
    + `&notes=${encodeURIComponent(notes)}`;

  const response = await fetch(url);
  const result = await response.json();

  if (result.success) {
    message.textContent = "Meeting created.";

    document.getElementById("meetingName").value = "";
    document.getElementById("meetingDate").value = "";
    document.getElementById("payPeriodID").value = "";
    document.getElementById("programType").value = "";
    document.getElementById("payRule").value = "";
    document.getElementById("hours").value = "";
    document.getElementById("fund").value = "";
    document.getElementById("meetingNotes").value = "";

    loadMeetings();
  } else {
    message.textContent = result.message || "Unable to create meeting.";
  }
}

async function loadMeetings() {
  const container = document.getElementById("meetingList");
  container.innerHTML = "<p>Loading meetings...</p>";

  const response = await fetch(`${API_URL}?action=getMeetings`);
  meetings = await response.json();

  if (!meetings || meetings.length === 0) {
    container.innerHTML = `
      <div class="dashboard-card">
        <h2>No Meetings Created</h2>
        <p>Create a meeting above to start tracking attendance.</p>
      </div>
    `;
    return;
  }

  let html = "";

  meetings
    .filter(meeting => String(meeting.Status || "Open").trim() !== "Closed")
    .sort((a, b) => new Date(b.MeetingDate) - new Date(a.MeetingDate))
    .forEach(meeting => {
      html += renderMeetingCard(meeting);
    });

  container.innerHTML = html;
}

function renderMeetingCard(meeting) {
  let rows = "";

  activeCoaches.forEach(coach => {
    const personID = coach.PersonID;

    rows += `
      <tr>
        <td>${coach.Name}</td>

        <td style="text-align:center;">
          <input
            type="checkbox"
            class="live-check"
            data-meetingid="${meeting.MeetingID}"
            data-personid="${personID}"
            onchange="handleAttendanceChoice('${meeting.MeetingID}', '${personID}', 'live')"
          >
        </td>

        <td style="text-align:center;">
          <input
            type="checkbox"
            class="later-check"
            data-meetingid="${meeting.MeetingID}"
            data-personid="${personID}"
            onchange="handleAttendanceChoice('${meeting.MeetingID}', '${personID}', 'later')"
          >
        </td>

        <td>
          <input
            type="date"
            class="watch-date"
            data-meetingid="${meeting.MeetingID}"
            data-personid="${personID}"
          >
        </td>
      </tr>
    `;
  });

  return `
    <div class="dashboard-card">
      <h2>${meeting.MeetingName}</h2>
      <p>
        <strong>Date:</strong> ${formatDateOnly(meeting.MeetingDate)}
        &nbsp; | &nbsp;
        <strong>Pay Period:</strong> ${meeting.PayPeriodID}
        &nbsp; | &nbsp;
        <strong>Pay:</strong> ${meeting.Hours} hour(s) • ${meeting.PayRule} • ${meeting.Fund}
      </p>

      <table class="modern-table">
        <thead>
          <tr>
            <th style="text-align:left;">Coach</th>
            <th style="text-align:center;">Live</th>
            <th style="text-align:center;">Watched Later</th>
            <th style="text-align:left;">Watch Date</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <br>

      <button onclick="saveMeetingAttendanceForMeeting('${meeting.MeetingID}')">
        Save Attendance for This Meeting
      </button>

      <p id="message-${meeting.MeetingID}"></p>
    </div>
  `;
}

function handleAttendanceChoice(meetingID, personID, choice) {
  const liveBox = document.querySelector(`.live-check[data-meetingid="${meetingID}"][data-personid="${personID}"]`);
  const laterBox = document.querySelector(`.later-check[data-meetingid="${meetingID}"][data-personid="${personID}"]`);

  if (choice === "live" && liveBox.checked) {
    laterBox.checked = false;
  }

  if (choice === "later" && laterBox.checked) {
    liveBox.checked = false;
  }
}

async function saveMeetingAttendanceForMeeting(meetingID) {
  const meeting = meetings.find(m => String(m.MeetingID) === String(meetingID));
  const message = document.getElementById(`message-${meetingID}`);

  if (!meeting) {
    alert("Meeting not found.");
    return;
  }

  const records = [];

  activeCoaches.forEach(coach => {
    const liveBox = document.querySelector(`.live-check[data-meetingid="${meetingID}"][data-personid="${coach.PersonID}"]`);
    const laterBox = document.querySelector(`.later-check[data-meetingid="${meetingID}"][data-personid="${coach.PersonID}"]`);
    const watchDateInput = document.querySelector(`.watch-date[data-meetingid="${meetingID}"][data-personid="${coach.PersonID}"]`);

    const watchedLive = liveBox && liveBox.checked;
    const watchedLater = laterBox && laterBox.checked;
    const watchDate = watchDateInput ? watchDateInput.value : "";

    if (!watchedLive && !watchedLater) return;

    if (watchedLater && !watchDate) {
      records.push({
        error: true,
        coachName: coach.Name
      });
      return;
    }

    records.push({
      personID: coach.PersonID,
      coachName: coach.Name,
      attendanceType: watchedLive ? "Live" : "Later",
      watchDate: watchedLive ? "" : watchDate
    });
  });

  const missingWatchDate = records.find(record => record.error);

  if (missingWatchDate) {
    message.textContent = `${missingWatchDate.coachName} is marked Watched Later but does not have a Watch Date.`;
    return;
  }

  if (records.length === 0) {
    message.textContent = "No coaches were marked for this meeting.";
    return;
  }

  const confirmSave = confirm(`Save attendance for ${records.length} coach(es) for ${meeting.MeetingName}?`);

  if (!confirmSave) return;

  const params = new URLSearchParams({
    action: "addMeetingAttendanceBatch",
    meetingID: meeting.MeetingID,
    meetingName: meeting.MeetingName,
    meetingDate: meeting.MeetingDate,
    payPeriodID: meeting.PayPeriodID,
    notes: meeting.Notes || "",
    records: JSON.stringify(records)
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: params
    });

    const result = await response.json();

    if (result.success) {
      message.textContent = result.message || "Attendance saved.";
    } else {
      message.textContent = result.message || "Unable to save attendance.";
    }

  } catch (error) {
    console.error(error);
    message.textContent = "Something went wrong saving attendance.";
  }
}

async function initPage() {
  await loadPayPeriods();
  await loadCoaches();
  await loadMeetings();
}

initPage();
