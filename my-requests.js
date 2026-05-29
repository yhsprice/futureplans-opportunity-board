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
        <h3>Opportunity #${request.OpportunityID}</h3>
        <p><strong>Status:</strong> ${request.Status}</p>
        <p><strong>Requested At:</strong> ${request.RequestedAt}</p>
      `;

      myRequestList.appendChild(div);
    });

  } catch (error) {
    myRequestList.innerHTML = "<p>Something went wrong loading your requests.</p>";
    console.error(error);
  }
}
