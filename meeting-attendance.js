const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();

let activeCoaches = [];

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
  const container = document.getElementById("coachAttendanceList");

  const response = await fetch(`${API_URL}?action=getPeople`);
  const people = await response.json();

  activeCoaches = people
    .filter(person =>
      person.Name &&
      String(person.Active || person.ActiveStatus || "").trim() === "Yes"
    )
    .sort((a, b) => a.Name.localeCompare(b.Name));

  if (activeCoaches.length === 0) {
    container.innerHTML = "<p>No active coaches found.</p>";
    return;
  }

  let html = `
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
  `;

  activeCoaches.forEach(coach => {
    html += `
      <tr>
        <td>${coach.Name}</td>

        <td style="text-align:center;">
          <input
            type="checkbox"
            class="live-check"
            data-personid="${coach.PersonID}"
            data-coachname="${coach.Name}"
            onchange="handleAttendanceChoice('${coach.PersonID}', 'live')"
          >
        </td>

        <td style="text-align:center;">
          <input
            type="checkbox"
            class="later-check"
            data-personid="${coach.PersonID}"
            data-coachname="${coach.Name}"
            onchange="handleAttendanceChoice('${coach.PersonID}', 'later')"
          >
        </td>

        <td>
          <input
            type="date"
            class="watch-date"
            data-personid="${coach.PersonID}"
          >
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

function handleAttendanceChoice(personID, choice) {
  const liveBox = document.querySelector(`.live-check[data-personid="${personID}"]`);
  const laterBox = document.querySelector(`.later-check[data-personid="${personID}"]`);

  if (choice === "live" && liveBox.checked) {
    laterBox.checked = false;
  }

  if (choice === "later" && laterBox.checked) {
    liveBox.checked = false;
  }
}

async function saveBulkMeetingAttendance() {
  const meetingName = document.getElementById("meetingName").value.trim();
  const meetingDate = document.getElementById("meetingDate").value;
  const payPeriodID = document.getElementById("payPeriodID").value;
  const notes = document.getElementById("notes").value.trim();
  const message = document.getElementById("attendanceMessage");

  if (!meetingName || !meetingDate || !payPeriodID) {
    message.textContent = "Please complete Meeting Name, Meeting Date, and Pay Period.";
    return;
  }

  const records = [];

  activeCoaches.forEach(coach => {
    const liveBox = document.querySelector(`.live-check[data-personid="${coach.PersonID}"]`);
    const laterBox = document.querySelector(`.later-check[data-personid="${coach.PersonID}"]`);
    const watchDateInput = document.querySelector(`.watch-date[data-personid="${coach.PersonID}"]`);

    const watchedLive = liveBox && liveBox.checked;
    const watchedLater = laterBox && laterBox.checked;
    const watchDate = watchDateInput ? watchDateInput.value : "";

    if (!watchedLive && !watchedLater) {
      return;
    }

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
    message.textContent = "No coaches were marked as live or watched later.";
    return;
  }

  const confirmSave = confirm(`Save attendance for ${records.length} coach(es)?`);

  if (!confirmSave) return;

  const params = new URLSearchParams({
    action: "addMeetingAttendanceBatch",
    meetingName,
    meetingDate,
    payPeriodID,
    notes,
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

      document.getElementById("meetingName").value = "";
      document.getElementById("meetingDate").value = "";
      document.getElementById("payPeriodID").value = "";
      document.getElementById("notes").value = "";

      document.querySelectorAll(".live-check, .later-check").forEach(box => {
        box.checked = false;
      });

      document.querySelectorAll(".watch-date").forEach(input => {
        input.value = "";
      });

      loadAttendanceLog();
    } else {
      message.textContent = result.message || "Unable to save attendance.";
    }

  } catch (error) {
    console.error(error);
    message.textContent = "Something went wrong saving attendance.";
  }
}

async function loadAttendanceLog() {
  const container = document.getElementById("attendanceLog");
  container.innerHTML = "<p>Loading attendance records...</p>";

  try {
    const response = await fetch(`${API_URL}?action=getMeetingAttendance`);
    const records = await response.json();

    if (!records || records.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h2>No Attendance Records</h2>
          <p>No meeting attendance has been logged yet.</p>
        </div>
      `;
      return;
    }

    let html = `
      <table class="modern-table">
        <thead>
          <tr>
            <th>Meeting</th>
            <th>Meeting Date</th>
            <th>Coach</th>
            <th>Attendance</th>
            <th>Watch Date</th>
            <th>Pay Period</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
    `;

    records
      .sort((a, b) => new Date(b.MeetingDate) - new Date(a.MeetingDate))
      .forEach(record => {
        html += `
          <tr>
            <td>${record.MeetingName || ""}</td>
            <td>${formatDateOnly(record.MeetingDate)}</td>
            <td>${record.CoachName || ""}</td>
            <td>${record.WatchedLive === "Yes" ? "Live" : record.WatchedLater === "Yes" ? "Watched Later" : ""}</td>
            <td>${formatDateOnly(record.WatchDate)}</td>
            <td>${record.PayPeriodID || ""}</td>
            <td>${record.AttendanceStatus || ""}</td>
            <td>${record.Notes || ""}</td>
          </tr>
        `;
      });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;

  } catch (error) {
    container.innerHTML = "<p>Something went wrong loading attendance records.</p>";
    console.error(error);
  }
}

loadPayPeriods();
loadCoaches();
loadAttendanceLog();
