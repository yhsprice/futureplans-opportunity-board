const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const totalsContainer = document.getElementById("payrollTotals");
const container = document.getElementById("payrollSummary");
const payPeriodSelect = document.getElementById("payPeriodSelect");
const sortBy = document.getElementById("sortBy");

showUserBanner();

async function loadPayPeriods() {
  const response = await fetch(`${API_URL}?action=getPayPeriods`);
  const payPeriods = await response.json();

  payPeriodSelect.innerHTML = "";

  payPeriods.forEach(period => {
    const option = document.createElement("option");
    option.value = period.PayPeriodID;
    option.textContent = `${period.PayPeriodID} | ${formatDate(period.StartDate)} - ${formatDate(period.EndDate)} | ${period.Status}`;
    payPeriodSelect.appendChild(option);
  });

  loadPayroll();
}

async function loadPayroll() {
  const selectedPayPeriod = payPeriodSelect.value;

  if (!selectedPayPeriod) {
    container.innerHTML = "<p>Select a pay period to view payroll.</p>";
    return;
  }

  container.innerHTML = "<p>Loading payroll...</p>";

  const response = await fetch(`${API_URL}?action=getCompletedSessions`);
  const sessions = await response.json();

  const approved = sessions.filter(s =>
  (s.Status === "Approved for Pay" ||
   s.Status === "Paid") &&
  s.PayPeriodID === selectedPayPeriod
);

  const summary = {};

  approved.forEach(session => {
    const coach = session.CoachName || "Unknown Coach";

    if (!summary[coach]) {
      summary[coach] = {
        hours: 0,
        pay: 0,
        sessions: 0
      };
    }

    summary[coach].hours += Number(session.PayHours || 0);
    summary[coach].pay += Number(session.PayAmount || 0);
    summary[coach].sessions += 1;
  });

  let coaches = Object.keys(summary);

  switch (sortBy.value) {
    case "pay":
      coaches.sort((a, b) => summary[b].pay - summary[a].pay);
      break;
    case "sessions":
      coaches.sort((a, b) => summary[b].sessions - summary[a].sessions);
      break;
    case "name":
      coaches.sort();
      break;
    default:
      coaches.sort((a, b) => summary[b].hours - summary[a].hours);
  }

  if (coaches.length === 0) {
    totalsContainer.innerHTML = "";
    container.innerHTML = `<p>No approved payroll items found for ${selectedPayPeriod}.</p>`;
    return;
  }

  let totalHours = 0;
  let totalPay = 0;
  let totalSessions = 0;

  let html = `
    <div class="dashboard-card">
      <h2>Payroll Summary: ${selectedPayPeriod}</h2>

      <table class="modern-table">
        <thead>
          <tr>
            <th style="text-align:left; padding:10px;">Coach</th>
            <th style="text-align:left; padding:10px;">Sessions</th>
            <th style="text-align:left; padding:10px;">Pay Hours</th>
            <th style="text-align:left; padding:10px;">Pay Amount</th>
          </tr>
        </thead>
        <tbody>
  `;

  coaches.forEach(coach => {
    totalHours += summary[coach].hours;
    totalPay += summary[coach].pay;
    totalSessions += summary[coach].sessions;

    html += `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #ddd;">${coach}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd;">${summary[coach].sessions}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd;">${summary[coach].hours.toFixed(2)}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd;">$${summary[coach].pay.toFixed(2)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>

      <h3>Total Hours: ${totalHours.toFixed(2)}</h3>
      <h3>Total Payroll: $${totalPay.toFixed(2)}</h3>
    </div>

    <div class="dashboard-card">
      <h2>Payroll Details</h2>

      <table class="modern-table">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px;">Coach</th>
            <th style="text-align:left; padding:8px;">Date</th>
            <th style="text-align:left; padding:8px;">Program</th>
            <th style="text-align:left; padding:8px;">Fund</th>
            <th style="text-align:left; padding:8px;">Service</th>
            <th style="text-align:left; padding:8px;">School/Agency</th>
            <th style="text-align:left; padding:8px;">Hours</th>
            <th style="text-align:left; padding:8px;">Pay</th>
            <th style="text-align:left; padding:8px;">Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  approved.forEach(session => {
    html += `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${session.CoachName || ""}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${formatDate(session.Date)}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${session.ProgramType || ""}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${session.Fund || ""}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${session.PayRule || ""}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${session.School || ""}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${Number(session.PayHours || 0).toFixed(2)}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">$${Number(session.PayAmount || 0).toFixed(2)}</td>
        <td style="padding:8px; border-bottom:1px solid #ddd;">
          <button onclick="editPayrollEntry('${session.SessionID}')">Edit</button>
          <button onclick="deletePayrollEntry('${session.SessionID}')">Delete</button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  totalsContainer.innerHTML = `
    <div class="dashboard-card">
      <h2>${selectedPayPeriod} Summary</h2>
      <p><strong>Total Coaches:</strong> ${coaches.length}</p>
      <p><strong>Total Sessions:</strong> ${totalSessions}</p>
      <p><strong>Total Hours:</strong> ${totalHours.toFixed(2)}</p>
      <p><strong>Total Payroll:</strong> $${totalPay.toFixed(2)}</p>
    </div>
  `;

  container.innerHTML = html;
}

async function deletePayrollEntry(sessionID) {
  if (!confirm("Delete this payroll entry?")) {
    return;
  }

  const response = await fetch(`${API_URL}?action=deleteCompletedSession&sessionID=${encodeURIComponent(sessionID)}`);
  const result = await response.json();

  alert(result.message || "Done.");
  loadPayroll();
}

async function editPayrollEntry(sessionID) {
  const response = await fetch(`${API_URL}?action=getCompletedSessions`);
  const sessions = await response.json();

  const session = sessions.find(s => String(s.SessionID) === String(sessionID));

  if (!session) {
    alert("Payroll entry not found.");
    return;
  }

  const date = prompt("Date:", formatDateForInput(session.Date));
  if (date === null) return;

  const programType = prompt("Program Type:", session.ProgramType || "");
  if (programType === null) return;

  const serviceType = prompt("Service Type:", session.PayRule || "");
  if (serviceType === null) return;

  const school = prompt("School / Agency optional:", session.School || "");
  if (school === null) return;

  const hours = prompt("Hours:", session.PayHours || "");
  if (hours === null) return;

  const notes = prompt("Notes:", session.Notes || "");
  if (notes === null) return;

  const params = new URLSearchParams({
    action: "editCompletedSession",
    sessionID,
    date,
    programType,
    serviceType,
    school,
    hours,
    notes
  });

  const saveResponse = await fetch(API_URL, {
    method: "POST",
    body: params
  });

  const result = await saveResponse.json();

  alert(result.message || "Done.");
  loadPayroll();
}

async function copyAccountingSummary() {
  const selectedPayPeriod = payPeriodSelect.value;

  if (!selectedPayPeriod) {
    alert("Please select a pay period first.");
    return;
  }

  const sessionsResponse = await fetch(`${API_URL}?action=getCompletedSessions`);
  const sessions = await sessionsResponse.json();

  const periodsResponse = await fetch(`${API_URL}?action=getPayPeriods`);
  const payPeriods = await periodsResponse.json();

  const period = payPeriods.find(p =>
    String(p.PayPeriodID) === String(selectedPayPeriod)
  );

  const approved = sessions.filter(s =>
    s.Status === "Approved for Pay" &&
    s.PayPeriodID === selectedPayPeriod
  );

  if (approved.length === 0) {
    alert("No approved payroll found for this pay period.");
    return;
  }

  const summary = {};

  approved.forEach(session => {
    const coach = session.CoachName || "Unknown Coach";

    if (!summary[coach]) {
      summary[coach] = {
        hours: 0,
        pay: 0
      };
    }

    summary[coach].hours += Number(session.PayHours || 0);
    summary[coach].pay += Number(session.PayAmount || 0);
  });

  const coaches = Object.keys(summary).sort();

  let totalHours = 0;
  let totalPay = 0;

  const payPeriodText = period
    ? `${formatDateOnly(period.StartDate)} - ${formatDateOnly(period.EndDate)}`
    : selectedPayPeriod;

  let text = `Future Plans Coach Payroll\n`;
  text += `Pay Period: ${payPeriodText}\n\n`;

  coaches.forEach(coach => {
    totalHours += summary[coach].hours;
    totalPay += summary[coach].pay;

    text += `${coach} - ${summary[coach].hours.toFixed(2)} hours - $${summary[coach].pay.toFixed(2)}\n`;
  });

  text += `\nTotal Hours: ${totalHours.toFixed(2)}\n`;
  text += `Total Payroll: $${totalPay.toFixed(2)}\n`;

  try {
    await navigator.clipboard.writeText(text);
    alert("Accounting summary copied. Paste it into your email.");
  } catch (error) {
    console.error(error);
    prompt("Copy this accounting summary:", text);
  }
}

async function markPayPeriodPaid() {
  const selectedPayPeriod = payPeriodSelect.value;

  if (!selectedPayPeriod) {
    alert("Please select a pay period first.");
    return;
  }

  const confirmPaid = confirm(
    "Mark all Approved for Pay records in this pay period as Paid? Do this only after accounting has processed payment."
  );

  if (!confirmPaid) {
    return;
  }

  const response = await fetch(
    `${API_URL}?action=markPayPeriodPaid&payPeriodID=${encodeURIComponent(selectedPayPeriod)}`
  );

  const result = await response.json();

  alert(result.message || "Done.");
  loadPayroll();
}

function formatDateForInput(value) {
  const date = new Date(value);
  if (isNaN(date)) return "";

  return date.toISOString().split("T")[0];
}

function formatDate(value) {
  const date = new Date(value);

  if (isNaN(date)) return value || "";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const formattedHours = String(hours).padStart(2, "0");

  return `${month}/${day}/${year} ${formattedHours}:${minutes} ${ampm}`;
}

function formatDateOnly(value) {
  const date = new Date(value);
  if (isNaN(date)) return value || "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

loadPayPeriods();
