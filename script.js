const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

const container = document.getElementById("opportunityList");

function formatDate(value) {
  const date = new Date(value);

  if (isNaN(date)) return value || "";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}

function formatTime(value) {
  const time = new Date(value);

  if (isNaN(time)) return value || "";

  return time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  });
}

async function loadOpportunities() {
  container.innerHTML = "<p>Loading opportunities...</p>";

  try {
    const response = await fetch(API_URL);
    const opportunities = await response.json();

    container.innerHTML = "";

    if (opportunities.length === 0) {
      container.innerHTML = "<p>No opportunities available right now.</p>";
      return;
    }

    opportunities.forEach(opportunity => {
      const school = opportunity.School || "School Not Listed";
      const date = formatDate(opportunity.Date);
      const startTime = formatTime(opportunity.StartTime);
      const endTime = formatTime(opportunity.EndTime);
      const openings = opportunity.RemainingOpenings ?? opportunity.CoachesNeeded ?? 0;
      const program = opportunity.ProgramType || "Not listed";

      const div = document.createElement("div");
      div.className = "opportunity";

      div.innerHTML = `
        <div class="opportunity-header">
          <h3>${school}</h3>
         <button onclick="requestOpportunity('${opportunity.OpportunityID}')">
          Request Opportunity
          </button>
        </div>

        <div class="opportunity-details">
          <div>
            <strong>Date</strong>
            <p>${date}</p>
          </div>

          <div>
            <strong>Time</strong>
            <p>${startTime} - ${endTime}</p>
          </div>

          <div>
            <strong>Openings Available</strong>
            <p>${openings}</p>
          </div>

          <div>
            <strong>Program</strong>
            <p>${program}</p>
          </div>
        </div>
      `;

      container.appendChild(div);
    });

  } catch (error) {
    container.innerHTML = "<p>Something went wrong loading opportunities.</p>";
    console.error(error);
  }
}

loadOpportunities();

async function requestOpportunity(opportunityID) {
  const personID = prompt("Enter your PersonID for testing:");

  if (!personID) {
    alert("Request cancelled.");
    return;
  }

  const requestData = {
    opportunityID: opportunityID,
    personID: personID
  };

  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(requestData)
    });

    alert("Request submitted for manager approval!");
  } catch (error) {
    alert("Something went wrong submitting the request.");
    console.error(error);
  }
}
