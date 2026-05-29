const opportunities = [
  {
    school: "Goshen High School",
    date: "9/15/2026",
    start: "10:45 AM",
    end: "11:28 AM",
    openings: 2
  },
  {
    school: "Western Brown High School",
    date: "9/16/2026",
    start: "8:00 AM",
    end: "9:00 AM",
    openings: 1
  }
];

const container = document.getElementById("opportunityList");

opportunities.forEach(opportunity => {

    const div = document.createElement("div");
    div.className = "opportunity";

    div.innerHTML = `
        <h3>${opportunity.school}</h3>
        <p>Date: ${opportunity.date}</p>
        <p>Time: ${opportunity.start} - ${opportunity.end}</p>
        <p>Openings: ${opportunity.openings}</p>

        <button>Request Opportunity</button>
    `;

    container.appendChild(div);
});
