const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "jsonp_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

    const script = document.createElement("script");

    window[callbackName] = function(data) {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.src = `${url}&callback=${callbackName}`;

    script.onerror = function(error) {
      delete window[callbackName];
      script.remove();
      reject(error);
    };

    document.body.appendChild(script);
  });
}

const totalsContainer = document.getElementById("payrollTotals");
const container = document.getElementById("payrollSummary");
const payPeriodSelect = document.getElementById("payPeriodSelect");
const sortBy = document.getElementById("sortBy");

showUserBanner();

async function loadPayPeriods() {
  try {
    const payPeriods = await jsonp(
      `${API_URL}?action=getPayPeriods`
    );

    payPeriodSelect.innerHTML = "";

    let currentPayPeriod = "";

    payPeriods.forEach(period => {
      const option = document.createElement("option");

      option.value = period.PayPeriodID;

      option.textContent =
        `${period.PayPeriodID} | ` +
        `${formatDateOnly(period.StartDate)} - ` +
        `${formatDateOnly(period.EndDate)} | ` +
        `${period.Status}`;

      payPeriodSelect.appendChild(option);

      if (String(period.Status).trim() === "Current") {
        currentPayPeriod = period.PayPeriodID;
      }
    });

    if (currentPayPeriod) {
      payPeriodSelect.value = currentPayPeriod;
    }

    await loadPayroll();

  } catch (error) {
    console.error("Pay period loading error:", error);

    payPeriodSelect.innerHTML = `
      <option value="">Unable to load pay periods</option>
    `;
  }
}

async function loadPayroll() {

  const selectedPayPeriod = payPeriodSelect.value;

  if (!selectedPayPeriod) return;

  const sessions = await jsonp(
    `${API_URL}?action=getCompletedSessions`
  );

  const statusFilter =
    document.getElementById("payrollStatusFilter")?.value || "Approved for Pay";

  const grantFilter =
    document.getElementById("grantFilter")?.value || "all";

  let payroll = sessions.filter(session => {

    if (session.PayPeriodID !== selectedPayPeriod)
      return false;

    if (statusFilter !== "all" &&
        session.Status !== statusFilter)
      return false;

    if (grantFilter !== "all" &&
        session.Fund !== grantFilter)
      return false;

    return true;
  });

  console.log("Payroll loaded:", payroll);

  loadSummaryCards(payroll);
  loadGrantTotals(payroll);
  loadPayrollTable(payroll);

}

function loadSummaryCards(payroll) {

  const coaches = new Set();

  let totalSessions = payroll.length;
  let totalHours = 0;
  let totalPayroll = 0;

  payroll.forEach(session => {

    coaches.add(session.CoachName);

    totalHours += Number(session.PayHours || 0);
    totalPayroll += Number(session.PayAmount || 0);

  });

  document.getElementById("totalCoaches").textContent =
    coaches.size;

  document.getElementById("totalSessions").textContent =
    totalSessions;

  document.getElementById("totalHours").textContent =
    totalHours.toFixed(2);

  document.getElementById("totalPayroll").textContent =
    "$" + totalPayroll.toFixed(2);

}

function loadGrantTotals(payroll) {
  const body = document.getElementById("grantTotalsBody");

  const grants = {};

  payroll.forEach(session => {
    const grant = session.Fund || "Unassigned";

    if (!grants[grant]) {
      grants[grant] = {
        sessions: 0,
        hours: 0,
        payroll: 0
      };
    }

    grants[grant].sessions += 1;
    grants[grant].hours += Number(session.PayHours || 0);
    grants[grant].payroll += Number(session.PayAmount || 0);
  });

  body.innerHTML = "";

  const grantNames = Object.keys(grants).sort();

  if (grantNames.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4">No payroll records found.</td>
      </tr>
    `;
    return;
  }

  let totalSessions = 0;
  let totalHours = 0;
  let totalPayroll = 0;

  grantNames.forEach(grant => {
    const values = grants[grant];

    totalSessions += values.sessions;
    totalHours += values.hours;
    totalPayroll += values.payroll;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${grant}</td>
      <td>${values.sessions}</td>
      <td>${values.hours.toFixed(2)}</td>
      <td>$${values.payroll.toFixed(2)}</td>
    `;

    body.appendChild(row);
  });

  const totalRow = document.createElement("tr");

  totalRow.innerHTML = `
    <td><strong>TOTAL</strong></td>
    <td><strong>${totalSessions}</strong></td>
    <td><strong>${totalHours.toFixed(2)}</strong></td>
    <td><strong>$${totalPayroll.toFixed(2)}</strong></td>
  `;

  body.appendChild(totalRow);
}

function loadPayrollTable(payroll) {
  const body = document.getElementById("payrollDetailBody");

  body.innerHTML = "";

  if (payroll.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="11">No payroll records found.</td>
      </tr>
    `;
    return;
  }

  const sortValue = sortBy.value;

  payroll.sort((a, b) => {
    switch (sortValue) {
      case "coach":
        return String(a.CoachName || "").localeCompare(String(b.CoachName || ""));

      case "grant":
        return String(a.Fund || "").localeCompare(String(b.Fund || ""));

      case "hours":
        return Number(b.PayHours || 0) - Number(a.PayHours || 0);

      case "pay":
        return Number(b.PayAmount || 0) - Number(a.PayAmount || 0);

      case "date":
      default:
        return new Date(a.Date) - new Date(b.Date);
    }
  });

  payroll.forEach(session => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${session.CoachName || ""}</td>
      <td>${formatDateOnly(session.Date)}</td>
      <td>${session.Fund || "Unassigned"}</td>
      <td>${session.ProgramType || ""}</td>
      <td>${session.PayRule || ""}</td>
      <td>${session.School || ""}</td>
      <td>${Number(session.PayHours || 0).toFixed(2)}</td>
      <td>$${Number(session.PayRate || 0).toFixed(2)}</td>
      <td>$${Number(session.PayAmount || 0).toFixed(2)}</td>
      <td>${session.Status || ""}</td>
      <td>
        <button onclick="editPayrollEntry('${session.SessionID}')">Edit</button>
        <button onclick="deletePayrollEntry('${session.SessionID}')">Delete</button>
      </td>
    `;

    body.appendChild(row);
  });
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

  if (!confirmPaid) return;

  const response = await fetch(
    `${API_URL}?action=markPayPeriodPaid&payPeriodID=${encodeURIComponent(selectedPayPeriod)}`
  );

  const result = await response.json();

  alert(result.message || "Done.");

  await loadPayPeriods();
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

loadPayPeriods();
