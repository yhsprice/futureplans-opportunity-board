const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

function addOpportunity() {
  const school = document.getElementById("school").value.trim();
  const date = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const coachesNeeded = document.getElementById("coachesNeeded").value;
  const programType = document.getElementById("programType").value.trim();
  const notes = document.getElementById("notes").value.trim();

  if (!school || !date || !startTime || !endTime || !coachesNeeded || !programType || !fund) {
    alert("Please complete all required fields including Program Type and Fund.");
    return;
  }

  const url = `${API_URL}?action=addOpportunity`
    + `&school=${encodeURIComponent(school)}`
    + `&date=${encodeURIComponent(date)}`
    + `&startTime=${encodeURIComponent(startTime)}`
    + `&endTime=${encodeURIComponent(endTime)}`
    + `&coachesNeeded=${encodeURIComponent(coachesNeeded)}`
    + `&programType=${encodeURIComponent(programType)}`
    + `&fund=${encodeURIComponent(fund)}`
    + `&notes=${encodeURIComponent(notes)}`;

  const img = new Image();
  img.src = url;

  alert("Opportunity added!");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 1000);
}
