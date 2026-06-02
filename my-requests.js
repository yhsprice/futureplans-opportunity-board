const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

const myRequestList = document.getElementById("myRequestList");

async function loadMyRequests() {
  const personID = document.getElementById("personIDInput").value.trim();

  if (!personID) {
    alert("Please enter your PersonID.");
    return;
  }

  myRequestList.innerHTML = "<p>Loading your requests...</p>";

  try {
    const response = await fetch(`${API_URL}?action=getRequests`);
    const requests = await response.json();

    const mine = requests.filter(request => String(request.PersonID) === String(personID));

    if (mine.length === 0) {
      myRequestList.innerHTML = `
        <div class="empty-state">
          <h2>No Requests Found</h2>
          <p>You do not have any requests yet.</p>
        </div>
      `;
      return;
    }

    myRequestList.innerHTML = "";

    mine.forEach(request => {
      const div = document.createElement("div");
      div.className = "opportunity";

      div.innerHTML = `
        <h3>${request.School}</h3>
        <p><strong>Date:</strong> ${request.Date}</p>
        <p><strong>Time:</strong> ${request.StartTime} - ${request.EndTime}</p>
        <p><strong>Status:</strong> ${request.Status}</p>
        <p><strong>Requested At:</strong> ${request.RequestedAt}</p>

${request.Status === "Approved" && request.PayrollGenerated !== "Yes"
  ? `<button onclick="completeRequest('${request.RequestID}')">
      Complete
    </button>`
  : request.PayrollGenerated === "Yes"
    ? `<p><strong>Completed:</strong> Submitted for pay approval</p>`
    : ""
}
      `;

      myRequestList.appendChild(div);
    });

  } catch (error) {
    myRequestList.innerHTML = "<p>Something went wrong loading your requests.</p>";
    console.error(error);
  }
}

function completeRequest(requestID) {
  const confirmComplete = confirm("Mark this approved opportunity as completed and submit it for pay approval?");

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
