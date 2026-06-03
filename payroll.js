const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

const totalsContainer = document.getElementById("payrollTotals");
const container = document.getElementById("payrollSummary");
const payPeriodSelect = document.getElementById("payPeriodSelect");
const sortBy = document.getElementById("sortBy");

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
    s.Status === "Approved for Pay" &&
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
    <div class="opportunity">
      <h2>Payroll Summary: ${selectedPayPeriod}</h2>

      <table style="width:100%; border-collapse:collapse;">
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
  `;

  totalsContainer.innerHTML = `
    <div class="opportunity">
      <h2>${selectedPayPeriod} Summary</h2>
      <p><strong>Total Coaches:</strong> ${coaches.length}</p>
      <p><strong>Total Sessions:</strong> ${totalSessions}</p>
      <p><strong>Total Hours:</strong> ${totalHours.toFixed(2)}</p>
      <p><strong>Total Payroll:</strong> $${totalPay.toFixed(2)}</p>
    </div>
  `;

  container.innerHTML = html;
}

function formatDate(value) {
  const date = new Date(value);
  if (isNaN(date)) return value || "";

  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

loadPayPeriods();
