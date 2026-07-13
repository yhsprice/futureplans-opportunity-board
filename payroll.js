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

  let currentPayPeriod = "";

payPeriods.forEach(period => {
  const option = document.createElement("option");
  option.value = period.PayPeriodID;
  option.textContent = `${period.PayPeriodID} | ${formatDate(period.StartDate)} - ${formatDate(period.EndDate)} | ${period.Status}`;

  payPeriodSelect.appendChild(option);

  if (period.Status === "Current") {
    currentPayPeriod = period.PayPeriodID;
  }
});

if (currentPayPeriod) {
  payPeriodSelect.value = currentPayPeriod;
}

loadPayroll();
}

async function loadPayroll() {

  const selectedPayPeriod = payPeriodSelect.value;

  if (!selectedPayPeriod) return;

  const response = await fetch(`${API_URL}?action=getCompletedSessions`);
  const sessions = await response.json();

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
