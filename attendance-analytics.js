const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();
showManagerLinksOnly();

const analyticsMessage =
  document.getElementById("analyticsMessage");

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "attendanceJsonp_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000);

    const script = document.createElement("script");

    window[callbackName] = function(data) {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.src =
      url +
      "&callback=" +
      encodeURIComponent(callbackName);

    script.onerror = function(event) {
      delete window[callbackName];
      script.remove();
      reject(event);
    };

    document.body.appendChild(script);
  });
}

async function loadAttendanceAnalytics() {
  analyticsMessage.textContent =
    "Loading attendance data...";

  try {
    const rows = await jsonp(
      `${API_URL}?action=getAttendanceAnalytics`
    );

    const completed =
  rows.filter(r =>
    (r.AppointmentOutcome || "") === "Completed"
  ).length;

const absent =
  rows.filter(r =>
    (r.AppointmentOutcome || "") === "Student Absent"
  ).length;

const studentCancelled =
  rows.filter(r =>
    (r.AppointmentOutcome || "") === "Student Cancelled"
  ).length;

const schoolCancelled =
  rows.filter(r =>
    (r.AppointmentOutcome || "") === "School Cancelled"
  ).length;

const schoolClosed =
  rows.filter(r =>
    (r.AppointmentOutcome || "") === "School Closed"
  ).length;

const technical =
  rows.filter(r =>
    (r.AppointmentOutcome || "") === "Technical Issue"
  ).length;

const other =
  rows.filter(r =>
    (r.AppointmentOutcome || "") === "Other"
  ).length;

    console.log("Attendance analytics rows:", rows);

    if (rows && rows.success === false) {
      throw new Error(
        rows.message || "Apps Script returned an error."
      );
    }

    if (!Array.isArray(rows)) {
      throw new Error(
        "Attendance Analytics did not return a list of rows."
      );
    }

    analyticsMessage.style.display = "none";

    const cards =
  document.getElementById("summaryCards");

cards.innerHTML = `
<div class="dashboard-card">
  <h3>Completed</h3>
  <h1>${completed}</h1>
</div>

<div class="dashboard-card">
  <h3>Student Absent</h3>
  <h1>${absent}</h1>
</div>

<div class="dashboard-card">
  <h3>Student Cancelled</h3>
  <h1>${studentCancelled}</h1>
</div>

<div class="dashboard-card">
  <h3>School Cancelled</h3>
  <h1>${schoolCancelled}</h1>
</div>

<div class="dashboard-card">
  <h3>School Closed</h3>
  <h1>${schoolClosed}</h1>
</div>

<div class="dashboard-card">
  <h3>Technical</h3>
  <h1>${technical}</h1>
</div>

<div class="dashboard-card">
  <h3>Other</h3>
  <h1>${other}</h1>
</div>
`;

  } catch (error) {
    console.error(
      "Attendance Analytics error:",
      error
    );

    analyticsMessage.textContent =
      `Something went wrong: ${error.message || "Unknown error"}`;
  }
}

loadAttendanceAnalytics();
