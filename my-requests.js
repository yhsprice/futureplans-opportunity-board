const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

const myRequestList = document.getElementById("myRequestList");

async function loadMyRequests() {
  const personID = document.getElementById("personIDInput").value.trim();

  if (!personID) {
    alert("Please enter your assigned staff number.");
    return;
  }

  myRequestList.innerHTML = "<p>Loading your requests...</p>";

  try {
    const response = await fetch(`${API_URL}?action=getRequests`);
    const requests = await response.json();

    const mine = requests
      .filter(request => String(request.PersonID) === String(personID))
      .sort((a, b) => {
        const dateA = new Date(`${a.Date} ${a.StartTime}`);
        const dateB = new Date(`${b.Date} ${b.StartTime}`);
        return dateA - dateB;
      });

    if (mine.length === 0) {
      myRequestList.innerHTML = `
        <div class="empty-state">
          <h2>No Requests Found</h2>
          <p>You do not have any requests yet.</p>
        </div>
      `;
      return;
    }

    const needsAction = mine.filter(request =>
      request.Status === "Approved" &&
      request.PayrollGenerated !== "Yes"
    );

    const submittedForPay = mine.filter(request =>
      request.PayrollGenerated === "Yes"
    );

    const waitingApproval = mine.filter(request =>
      request.Status === "Pending Approval"
    );

    const closed = mine.filter(request =>
      request.Status === "Denied" ||
      request.Status === "Coach Cancelled"
    );

    myRequestList.innerHTML = "";

    renderSection("Needs Action", needsAction, true);
    renderSection("Submitted for Pay", submittedForPay, false);
    renderSection("Waiting for Approval", waitingApproval, false);
    renderSection("Closed", closed, false);

  } catch (error) {
    myRequestList.innerHTML = "<p>Something went wrong loading your requests.</p>";
    console.error(error);
  }
}

function renderSection(title, requests, showCompleteButton) {
  const section = document.createElement("div");
  section.className = "opportunity";

  let html = `<h2>${title} (${requests.length})</h2>`;

  if (requests.length === 0) {
    html += `<p>Nothing here right now.</p>`;
    section.innerHTML = html;
    myRequestList.appendChild(section);
    return;
  }

  html += `
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:8px;">Date</th>
          <th style="text-align:left; padding:8px;">Start</th>
          <th style="text-align:left; padding:8px;">End</th>
          <th style="text-align:left; padding:8px; min-width:180px;">School</th>
          <th style="text-align:left; padding:8px;">Program</th>
          <th style="text-align:left; padding:8px;">Status</th>
          <th style="text-align:left; padding:8px;">Submitted</th>
          <th style="text-align:left; padding:8px;">Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  requests.forEach(request => {
    const submittedText = request.PayrollGenerated === "Yes"
      ? `Yes<br><small>${request.PayrollGeneratedAt || ""}</small>`
      : "No";

    const action = showCompleteButton
      ? `<button onclick="completeRequest('${request.RequestID}')">Complete</button>`
      : request.PayrollGenerated === "Yes"
        ? `<strong>Already submitted</strong>`
        : "";

    html += `
      <tr>
        <td style="padding:8px; white-space:nowrap;">${request.Date}</td>
        <td style="padding:8px; white-space:nowrap;">${request.StartTime}</td>
        <td style="padding:8px; white-space:nowrap;">${request.EndTime}</td>
        <td style="padding:8px; min-width:180px;">${request.School}</td>
        <td style="padding:8px;">${request.ProgramType || ""}</td>
        <td style="padding:8px;">${request.Status}</td>
        <td style="padding:8px;">${submittedText}</td>
        <td style="padding:8px;">${action}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  section.innerHTML = html;
  myRequestList.appendChild(section);
}

function completeRequest(requestID) {
  const confirmComplete = confirm(
    "Mark this approved opportunity as completed and submit it for pay approval?"
  );

  if (!confirmComplete) {
    return;
  }

  fetch(`${API_URL}?action=completeRequest&requestID=${encodeURIComponent(requestID)}`)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Completed session submitted for pay approval.");
        loadMyRequests();
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong submitting the completed session.");
      console.error(error);
    });
}
