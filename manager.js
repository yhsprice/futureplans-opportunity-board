const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

const requestList = document.getElementById("requestList");

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
        <p><strong>School:</strong> ${request.School}</p>
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

loadRequests();
