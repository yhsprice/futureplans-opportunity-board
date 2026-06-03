const API_URL = "https://script.google.com/macros/s/AKfycbztmN1-FfXwhUsmmRqseDW2rr8-DIUYUUENM5J7kJBZN0xrSIkfTTbZqXAFhh5qO0Xv/exec";

function submitSession() {
  const personID = document.getElementById("personID").value.trim();
  const school = document.getElementById("school").value.trim();
  const date = document.getElementById("date").value;
  const programType = document.getElementById("programType").value.trim();
  const notes = document.getElementById("notes").value.trim();
  const payRule = document.getElementById("payRule").value;
  const revolutionTier = document.getElementById("revolutionTier").value;

if (!personID || !school || !date) {
  alert("Please complete staff number, school, and date.");
  return;
}

  const url = `${API_URL}?action=submitSession`
    + `&personID=${encodeURIComponent(personID)}`
    + `&school=${encodeURIComponent(school)}`
    + `&date=${encodeURIComponent(date)}`
    + `&programType=${encodeURIComponent(programType)}`
    + `&payRule=${encodeURIComponent(payRule)}`
    + `&revolutionTier=${encodeURIComponent(revolutionTier)}`
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
