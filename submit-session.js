const API_URL = "https://script.google.com/macros/s/AKfycbwP9QdngM5iBsdCXWi8_p1_MyzkaTIo-m87TZcIvG9sVOcWoeanaVJbcDnanhr9g_-0mA/exec";

function submitSession() {
  const personID = document.getElementById("personID").value.trim();
  const school = document.getElementById("school").value.trim();
  const date = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const programType = document.getElementById("programType").value.trim();
  const notes = document.getElementById("notes").value.trim();

  if (!personID || !school || !date || !startTime || !endTime) {
    alert("Please complete staff number, school, date, start time, and end time.");
    return;
  }

  const url = `${API_URL}?action=submitSession`
    + `&personID=${encodeURIComponent(personID)}`
    + `&school=${encodeURIComponent(school)}`
    + `&date=${encodeURIComponent(date)}`
    + `&startTime=${encodeURIComponent(startTime)}`
    + `&endTime=${encodeURIComponent(endTime)}`
    + `&programType=${encodeURIComponent(programType)}`
    + `&notes=${encodeURIComponent(notes)}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert("Session submitted for approval.");
        window.location.href = "index.html";
      } else {
        alert(result.message || "Something went wrong.");
      }
    })
    .catch(error => {
      alert("Something went wrong submitting the session.");
      console.error(error);
    });
}
