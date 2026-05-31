const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

const requestList = document.getElementById("requestList");

const payApprovalList = document.getElementById("payApprovalList");

async function loadRequests() {
  requestList.innerHTML = "<p>Loading requests...</p>";

  try {
    const response = await fetch(`${API_URL}?action=getRequests`);
    const requests = await response.json();

    requestList.innerHTML = "";

    const pending = requests.filter(request => request.Status === "Pending Approval");

    if (pending.length === 0) {
      requestList.innerHTML = `
        <div class="empty-state">
          <h2>No Pending Requests</h2>
          <p>All caught up. No approvals needed right now.</p>
        </div>
      `;
      return;
    }

    pending.forEach(request => {
      const div = document.createElement("div");
      div.className = "opportunity";

      div.innerHTML = `
       <h3>${request.School}</h3>
        <p><strong>Date:</strong> ${request.Date}</p>
        <p><strong>Time:</strong> ${request.StartTime} - ${request.EndTime}</p>
        <p><strong>Coach:</strong> ${request.CoachName}</p>
        <p><strong>Requested At:</strong> ${request.RequestedAt}</p>
        <p><strong>Status:</strong> ${request.Status}</p>

        <button onclick="updateRequest('${request.RequestID}', 'Approved')">
          Approve
        </button>

        <button onclick="updateRequest('${request.RequestID}', 'Denied')">
          Deny
        </button>
      `;

      requestList.appendChild(div);
    });

  } catch (error) {
    requestList.innerHTML = "<p>Something went wrong loading requests.</p>";
    console.error(error);
  }
}

function updateRequest(requestID, newStatus) {
  const url = `${API_URL}?action=updateRequest&requestID=${encodeURIComponent(requestID)}&status=${encodeURIComponent(newStatus)}`;

  const img = new Image();
  img.src = url;

  alert(`Request marked as ${newStatus}.`);

  setTimeout(() => {
    loadRequests();
  }, 1500);
}

async function loadPayApprovals() {
  payApprovalList.innerHTML = "<p>Loading pay approvals...</p>";

  try {
    const response = await fetch(`${API_URL}?action=getCompletedSessions`);
    const sessions = await response.json();

    const pending = sessions.filter(session =>
      session.Status === "Pending Pay Approval"
    );

    if (pending.length === 0) {
      payApprovalList.innerHTML = `
        <div class="empty-state">
          <h2>No Pending Pay Approvals</h2>
          <p>All submitted sessions have been reviewed.</p>
        </div>
      `;
      return;
    }

    payApprovalList.innerHTML = "";

    pending.forEach(session => {
      const div = document.createElement("div");
      div.className = "opportunity";

      div.innerHTML = `
        <h3>${session.School}</h3>
        <p><strong>Coach:</strong> ${session.CoachName}</p>
        <p><strong>Date:</strong> ${session.Date}</p>
        <p><strong>Pay Rule:</strong> ${session.PayRule}</p>
        <p><strong>Pay Hours:</strong> ${session.PayHours}</p>
        <p><strong>Pay Amount:</strong> $${session.PayAmount}</p>
        <p><strong>Notes:</strong> ${session.Notes || ""}</p>
        <button onclick="updatePayApproval('${session.SessionID}', 'Approved for Pay')">
          Approve for Pay
        </button>

<button onclick="updatePayApproval('${session.SessionID}', 'Denied')">
  Deny
</button>
      `;

      payApprovalList.appendChild(div);
    });

  } catch (error) {
    payApprovalList.innerHTML = "<p>Something went wrong loading pay approvals.</p>";
    console.error(error);
  }
}

loadRequests();
loadPayApprovals();
