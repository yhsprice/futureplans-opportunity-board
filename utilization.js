https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec

const container = document.getElementById("utilizationReport");

async function loadUtilization() {
  container.innerHTML = "<p>Loading utilization...</p>";

  const sessionsResponse = await fetch(`${API_URL}?action=getCompletedSessions`);
  const sessions = await sessionsResponse.json();

  const payPeriodsResponse = await fetch(`${API_URL}?action=getPayPeriods`);
  const payPeriods = await payPeriodsResponse.json();

  const currentPayPeriod = payPeriods.find(period =>
    String(period.Status).trim() === "Current"
  );

  if (!currentPayPeriod) {
    container.innerHTML = "<p>No current pay period found.</p>";
    return;
  }

  const currentPayPeriodID = currentPayPeriod.PayPeriodID;

  const approved = sessions.filter(s =>
    s.Status === "Approved for Pay" &&
    s.PayPeriodID === currentPayPeriodID
  );

  const summary = {};

  approved.forEach(session => {
    const coach = session.CoachName || "Unknown Coach";

    if (!summary[coach]) {
      summary[coach] = {
        sessions: 0,
        hours: 0,
        pay: 0
      };
    }

    summary[coach].sessions += 1;
    summary[coach].hours += Number(session.PayHours || 0);
    summary[coach].pay += Number(session.PayAmount || 0);
  });

  const coaches = Object.keys(summary).sort();

  if (coaches.length === 0) {
    container.innerHTML = `<p>No approved payroll records found for ${currentPayPeriodID}.</p>`;
    return;
  }

  let html = `
    <div class="opportunity">
      <h2>Coach Utilization: ${currentPayPeriodID}</h2>
      <table>
        <thead>
          <tr>
            <th>Coach</th>
            <th>Sessions</th>
            <th>Hours</th>
            <th>Pay</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
  `;

  coaches.forEach(coach => {
    const hours = summary[coach].hours;
    let status = "Normal";

    if (hours === 0) status = "No Assignments";
    else if (hours <= 4) status = "Low Usage";
    else if (hours >= 21) status = "High Usage";

    html += `
      <tr>
        <td>${coach}</td>
        <td>${summary[coach].sessions}</td>
        <td>${hours.toFixed(2)}</td>
        <td>$${summary[coach].pay.toFixed(2)}</td>
        <td>${status}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

loadUtilization();
