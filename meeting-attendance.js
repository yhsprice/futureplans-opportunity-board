const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();

async function loadCoachNames() {
  const list = document.getElementById("coachNameList");

  const response = await fetch(`${API_URL}?action=getPeople`);
  const people = await response.json();

  list.innerHTML = "";

  people.forEach(person => {
    if (!person.Name) return;

    const option = document.createElement("option");
    option.value = person.Name;
    list.appendChild(option);
  });
}

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
            <td>${record.AttendanceType || ""}</td>
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

async function addMeetingAttendance() {
  const meetingName = document.getElementById("meetingName").value.trim();
  const meetingDate = document.getElementById("meetingDate").value;
  const coachName = document.getElementById("coachName").value.trim();
  const attendanceType = document.getElementById("attendanceType").value;
  const watchDate = document.getElementById("watchDate").value;
  const payPeriodID = document.getElementById("payPeriodID").value;
  const notes = document.getElementById("notes").value.trim();
  const message = document.getElementById("attendanceMessage");

  if (!meetingName || !meetingDate || !coachName || !attendanceType || !payPeriodID) {
    message.textContent = "Please complete Meeting Name, Meeting Date, Coach Name, Attendance Type, and Pay Period.";
    return;
  }

  const params = new URLSearchParams({
    action: "addMeetingAttendance",
    meetingName,
    meetingDate,
    coachName,
    attendanceType,
    watchDate,
    payPeriodID,
    notes
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: params
    });

    const result = await response.json();

    if (result.success) {
      message.textContent = "Attendance added.";

      document.getElementById("meetingName").value = "";
      document.getElementById("meetingDate").value = "";
      document.getElementById("coachName").value = "";
      document.getElementById("attendanceType").value = "";
      document.getElementById("watchDate").value = "";
      document.getElementById("payPeriodID").value = "";
      document.getElementById("notes").value = "";

      loadAttendanceLog();
    } else {
      message.textContent = result.message || "Unable to add attendance.";
    }

  } catch (error) {
    console.error(error);
    message.textContent = "Something went wrong adding attendance.";
  }
}

loadCoachNames();
loadPayPeriods();
loadAttendanceLog();
