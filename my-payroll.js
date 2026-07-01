const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

const currentUser = getCurrentUser();
const payrollList = document.getElementById("myPayrollList");
const summaryCards = document.getElementById("payrollSummaryCards");

showUserBanner();
showManagerLinksOnly();

async function loadMyPayroll() {
  payrollList.innerHTML = "<p>Loading payroll...</p>";

  try {
    const sessionsResponse = await fetch(`${API_URL}?action=getCompletedSessions`);
    const sessions = await sessionsResponse.json();

    const periodsResponse = await fetch(`${API_URL}?action=getPayPeriods`);
    const payPeriods = await periodsResponse.json();
    const approvalsResponse = await fetch(`${API_URL}?action=getCoachPayrollApprovals`);
    const payrollApprovals = await approvalsResponse.json();

    const mySessions = sessions.filter(session =>
      String(session.PersonID) === String(currentUser.PersonID)
    );

    if (mySessions.length === 0) {
      summaryCards.innerHTML = "";
      payrollList.innerHTML = `
        <div class="dashboard-card">
          <h2>No Payroll Records Found</h2>
          <p>You do not have any submitted payroll records yet.</p>
        </div>
      `;
      return;
    }

    const payableSessions = mySessions.filter(session =>
      session.Status === "Pending Pay Approval" ||
      session.Status === "Approved for Pay" ||
      session.Status === "Paid"
    );

    const unapprovedSessions = mySessions.filter(session =>
      session.Status === "Denied" ||
      session.Status === "Cancelled" ||
      session.Status === "Unapproved"
    );

    const periodMap = {};
    payPeriods.forEach(period => {
      periodMap[String(period.PayPeriodID)] = period;
    });

    let pendingTotal = 0;
    let approvedTotal = 0;
    let paidTotal = 0;

    payableSessions.forEach(session => {
      const amount = Number(session.PayAmount || 0);

      if (session.Status === "Pending Pay Approval") pendingTotal += amount;
      if (session.Status === "Approved for Pay") approvedTotal += amount;
      if (session.Status === "Paid") paidTotal += amount;
    });

    summaryCards.innerHTML = `
      <div class="stat-card orange">
        <div class="stat-number">$${pendingTotal.toFixed(2)}</div>
        <h3>Pending Approval</h3>
        <p>Submitted time waiting for review.</p>
      </div>

      <div class="stat-card green">
        <div class="stat-number">$${approvedTotal.toFixed(2)}</div>
        <h3>Approved for Pay</h3>
        <p>Approved payroll not yet marked paid.</p>
      </div>

      <div class="stat-card blue">
        <div class="stat-number">$${paidTotal.toFixed(2)}</div>
        <h3>Paid</h3>
        <p>Payroll marked as paid.</p>
      </div>
    `;

    const grouped = {};

    payableSessions.forEach(session => {
      const payPeriodID = String(session.PayPeriodID || "No Pay Period");

      if (!grouped[payPeriodID]) {
        grouped[payPeriodID] = [];
      }

      grouped[payPeriodID].push(session);
    });

    let html = "";

    Object.keys(grouped).sort().reverse().forEach(payPeriodID => {
      const period = periodMap[payPeriodID];
      const sessionsForPeriod = grouped[payPeriodID];

      let totalHours = 0;
      let totalPay = 0;

      sessionsForPeriod.forEach(session => {
        totalHours += Number(session.PayHours || 0);
        totalPay += Number(session.PayAmount || 0);
      });

      const periodTitle = period
        ? `${formatDateLong(period.StartDate)} - ${formatDateLong(period.EndDate)}`
        : payPeriodID;

      const coachApproval = payrollApprovals.find(approval =>
  String(approval.PersonID) === String(currentUser.PersonID) &&
  String(approval.PayPeriodID) === String(payPeriodID)
);

let approvalAlert = "";

if (coachApproval && coachApproval.Status === "Coach Approved") {
  approvalAlert = `
    <div style="background:#d4edda; color:#155724; padding:12px; border-radius:8px; margin:12px 0;">
      ✅ Good job! You approved this payroll on ${formatDateTime(coachApproval.ApprovedAt)}.
    </div>
  `;
} else if (coachApproval && coachApproval.Status === "Not Approved In Time") {
  approvalAlert = `
    <div style="background:#f8d7da; color:#721c24; padding:12px; border-radius:8px; margin:12px 0;">
      ⚠️ Payroll was submitted to HR, but you did not approve it before the deadline.
    </div>
  `;
} else {
  approvalAlert = `
    <div style="background:#fff3cd; color:#856404; padding:12px; border-radius:8px; margin:12px 0;">
      Please review this payroll and approve it before the end of the first day of the next pay period.
      <br><br>
      <button onclick="approveMyPayroll('${payPeriodID}')">
        Approve This Payroll
      </button>
    </div>
  `;
}

      html += `
        <div class="dashboard-card">
          <h2>${periodTitle}</h2>
${approvalAlert}

          <p>
            <strong>Total Hours:</strong> ${totalHours.toFixed(2)}
            &nbsp; | &nbsp;
            <strong>Total Pay:</strong> $${totalPay.toFixed(2)}
          </p>

          <table class="modern-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Program</th>
                <th>Fund</th>
                <th>School / Agency</th>
                <th>Hours</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
      `;

      sessionsForPeriod
        .sort((a, b) => new Date(a.Date) - new Date(b.Date))
        .forEach(session => {
          html += `
            <tr>
              <td>${formatDateShort(session.Date)}</td>
              <td>${session.PayRule || ""}</td>
              <td>${session.ProgramType || ""}</td>
              <td>${session.Fund || ""}</td>
              <td>${session.School || ""}</td>
              <td>${Number(session.PayHours || 0).toFixed(2)}</td>
              <td>$${Number(session.PayAmount || 0).toFixed(2)}</td>
              <td>${formatStatus(session.Status)}</td>
            </tr>
          `;
        });

      html += `
            </tbody>
          </table>
        </div>
      `;
    });

    if (unapprovedSessions.length > 0) {
      html += `
        <div class="dashboard-card">
          <h2>Cancelled / Unapproved</h2>
          <p>These items are not included in your approved payroll totals.</p>

          <table class="modern-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Program</th>
                <th>Fund</th>
                <th>School / Agency</th>
                <th>Hours</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
      `;

      unapprovedSessions
        .sort((a, b) => new Date(a.Date) - new Date(b.Date))
        .forEach(session => {
          html += `
            <tr>
              <td>${formatDateShort(session.Date)}</td>
              <td>${session.PayRule || ""}</td>
              <td>${session.ProgramType || ""}</td>
              <td>${session.Fund || ""}</td>
              <td>${session.School || ""}</td>
              <td>${Number(session.PayHours || 0).toFixed(2)}</td>
              <td>$${Number(session.PayAmount || 0).toFixed(2)}</td>
              <td>${formatStatus(session.Status)}</td>
            </tr>
          `;
        });

      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    payrollList.innerHTML = html;

  } catch (error) {
    payrollList.innerHTML = "<p>Something went wrong loading payroll.</p>";
    console.error(error);
  }
}

function formatDateShort(value) {
  const date = new Date(value);
  if (isNaN(date)) return value || "";

  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function formatDateLong(value) {
  const date = new Date(value);
  if (isNaN(date)) return value || "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function formatStatus(status) {
  if (status === "Pending Pay Approval") {
    return "🟡 Pending Approval";
  }

  if (status === "Approved for Pay") {
    return "🟢 Approved for Pay";
  }

  if (status === "Paid") {
    return "🔵 Paid";
  }

  if (status === "Denied") {
    return "🔴 Denied";
  }

  if (status === "Cancelled") {
    return "⚫ Cancelled";
  }

  if (status === "Unapproved") {
    return "🔴 Unapproved";
  }

  return status || "";
}

function approveMyPayroll(payPeriodID) {
  const confirmApproval = confirm(
    "Approve this payroll period? This confirms you reviewed your payroll and agree it is correct."
  );

  if (!confirmApproval) return;

  const url = `${API_URL}?action=approveCoachPayroll`
    + `&personID=${encodeURIComponent(currentUser.PersonID)}`
    + `&payPeriodID=${encodeURIComponent(payPeriodID)}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      alert(result.message || "Payroll approval saved.");
      loadMyPayroll();
    })
    .catch(error => {
      alert("Something went wrong approving payroll.");
      console.error(error);
    });
}

loadMyPayroll();
