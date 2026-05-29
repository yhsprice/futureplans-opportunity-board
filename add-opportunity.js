const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

function addOpportunity() {
  const school = document.getElementById("school").value.trim();
  const date = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const coachesNeeded = document.getElementById("coachesNeeded").value;
  const programType = document.getElementById("programType").value.trim();
  const notes = document.getElementById("notes").value.trim();

  if (!school || !date || !startTime || !endTime || !coachesNeeded) {
    alert("Please complete school, date, start time, end time, and coaches needed.");
    return;
  }

  const url = `${API_URL}?action=addOpportunity`
    + `&school=${encodeURIComponent(school)}`
    + `&date=${encodeURIComponent(date)}`
    + `&startTime=${encodeURIComponent(startTime)}`
    + `&endTime=${encodeURIComponent(endTime)}`
    + `&coachesNeeded=${encodeURIComponent(coachesNeeded)}`
    + `&programType=${encodeURIComponent(programType)}`
    + `&notes=${encodeURIComponent(notes)}`;

  const img = new Image();
  img.src = url;

  alert("Opportunity added!");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 1000);
}
