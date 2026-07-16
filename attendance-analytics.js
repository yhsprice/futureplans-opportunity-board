const API_URL =
  "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

showUserBanner();
showManagerLinksOnly();

const analyticsMessage =
  document.getElementById("analyticsMessage");

const summaryCards =
  document.getElementById("summaryCards");

const fiscalYearFilter =
  document.getElementById("fiscalYearFilter");

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

function countOutcome(rows, outcome) {
  return rows.filter(row =>
    String(row.AppointmentOutcome || "").trim() === outcome
  ).length;
}

function parseRecordDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function filterByFiscalYear(rows, fiscalYearStart) {
  const startDate =
    new Date(fiscalYearStart, 6, 1, 0, 0, 0);

  const endDate =
    new Date(
      fiscalYearStart + 1,
      5,
      30,
      23,
      59,
      59
    );

  return rows.filter(row => {
    const rowDate = parseRecordDate(row.Date);

    if (!rowDate) {
      return false;
    }

    return (
      rowDate >= startDate &&
      rowDate <= endDate
    );
  });
}

function renderSummaryCards(rows) {
  const totalAppointments = rows.length;

  const completed =
    countOutcome(rows, "Completed");

  const absent =
    countOutcome(rows, "Student Absent");

  const studentCancelled =
    countOutcome(rows, "Student Cancelled");

  const schoolCancelled =
    countOutcome(rows, "School Cancelled");

  const schoolClosed =
    countOutcome(rows, "School Closed");

  const technical =
    countOutcome(rows, "Technical Issue");

  const other =
    countOutcome(rows, "Other");

  const completionRate =
    totalAppointments === 0
      ? "0.0"
      : (
          (completed / totalAppointments) *
          100
        ).toFixed(1);

  const absenceRate =
    totalAppointments === 0
      ? "0.0"
      : (
          (absent / totalAppointments) *
          100
        ).toFixed(1);

  const cancellationTotal =
    studentCancelled + schoolCancelled;

  const cancellationRate =
    totalAppointments === 0
      ? "0.0"
      : (
          (cancellationTotal / totalAppointments) *
          100
        ).toFixed(1);

  const totalHours = rows.reduce(
    (total, row) => {
      const hours = Number(
        row.PayHours ||
        row.Hours ||
        row.RevolutionTier ||
        0
      );

      return total + (
        isNaN(hours) ? 0 : hours
      );
    },
    0
  );

  summaryCards.innerHTML = `
    <div class="dashboard-card">
      <h3>Total Appointments</h3>
      <h1>${totalAppointments}</h1>
    </div>

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
      <h3>Technical Issue</h3>
      <h1>${technical}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Other</h3>
      <h1>${other}</h1>
    </div>

    <div class="dashboard-card">
      <h3>Completion Rate</h3>
      <h1>${completionRate}%</h1>
    </div>

    <div class="dashboard-card">
      <h3>Absence Rate</h3>
      <h1>${absenceRate}%</h1>
    </div>

    <div class="dashboard-card">
      <h3>Cancellation Rate</h3>
      <h1>${cancellationRate}%</h1>
    </div>

    <div class="dashboard-card">
      <h3>Total Hours</h3>
      <h1>${totalHours.toFixed(2)}</h1>
    </div>
  `;
}

async function loadAttendanceAnalytics() {
  analyticsMessage.style.display = "block";
  analyticsMessage.textContent =
    "Loading attendance data...";

  summaryCards.innerHTML = "";

  try {
    const rows = await jsonp(
      `${API_URL}?action=getAttendanceAnalytics`
    );

    console.log(
      "Attendance analytics rows:",
      rows
    );

    if (rows && rows.success === false) {
      throw new Error(
        rows.message ||
        "Apps Script returned an error."
      );
    }

    if (!Array.isArray(rows)) {
      throw new Error(
        "Attendance Analytics did not return a list of rows."
      );
    }

    const fiscalYear =
      Number(fiscalYearFilter.value);

    const filteredRows =
      filterByFiscalYear(
        rows,
        fiscalYear
      );

    console.log(
      "Fiscal-year rows:",
      filteredRows
    );

    analyticsMessage.style.display =
      "none";

    renderSummaryCards(filteredRows);

  } catch (error) {
    console.error(
      "Attendance Analytics error:",
      error
    );

    analyticsMessage.style.display =
      "block";

    analyticsMessage.textContent =
      `Something went wrong: ${
        error.message || "Unknown error"
      }`;
  }
}

fiscalYearFilter.addEventListener(
  "change",
  loadAttendanceAnalytics
);

loadAttendanceAnalytics();
