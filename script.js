const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

const container = document.getElementById("opportunityList");

async function loadOpportunities() {
  container.innerHTML = "<p>Loading opportunities...</p>";

  try {
    const response = await fetch(API_URL);
    const opportunities = await response.json();

    container.innerHTML = "";

    opportunities.forEach(opportunity => {
      const div = document.createElement("div");
      div.className = "opportunity";

      div.innerHTML = `
        <h3>${opportunity.School}</h3>
        <p><strong>Date:</strong> ${opportunity.Date}</p>
        <p><strong>Time:</strong> ${opportunity.StartTime} - ${opportunity.EndTime}</p>
        <p><strong>Openings Needed:</strong> ${opportunity.CoachesNeeded}</p>
        <p><strong>Program:</strong> ${opportunity.ProgramType || ""}</p>
        <button>Request Opportunity</button>
      `;

      container.appendChild(div);
    });

    if (opportunities.length === 0) {
      container.innerHTML = "<p>No opportunities available right now.</p>";
    }

  } catch (error) {
    container.innerHTML = "<p>Something went wrong loading opportunities.</p>";
    console.error(error);
  }
}

loadOpportunities();
