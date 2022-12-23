function getExampleData() {
  axios
    .get(WWW + "/example_data", { responseType: "blob" })
    .then((response) => {
      handleResponseCode(response);
      downloadBlob(response.data, "example_data.zip");
    });
}

function startExampleSession() {
  Swal.fire({
    title: "We use a cookie so that you can access your data!",
    iconHtml: `
        <div id="cookie-consent-icon-container">
          <i class='fa-solid fa-cookie'></i>
          <i class='fa-solid fa-circle'></i>
        <div>
      `,
    html: `
        <ul id="cookie-consent-text-container">
          <li>As long as you keep the cookie, you can return here and continue with your session.</li>
          <li>Accepting this cookie will create a session with our sample dataset for you on our server.</li>
          <li>No personalized data is collected or shared with third parties and you will not be tracked by this cookie.</li>
          <li>The cookie will expire after five days and your example session will be deleted.</li>
        </ul>
      `,
    padding: "0.5em",
    position: "bottom",
    width: "100%",
    color: "#747474",
    background: "#fafafcd9",
    showCancelButton: true,
    cancelButtonColor: "#fe4848cc",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#39c093cc",
    confirmButtonText: "Consent and Start Example",
    allowOutsideClick: false,
    allowEscapeKey: false,
    backdrop: `
          rgba(239, 240, 248, 0.1)
          left top
          no-repeat
      `,
  }).then((result) => {
    if (result.isConfirmed) {
      axios
        .get(WWW + "/example_session")
        .then((response) => {
          handleResponseCode(response);
          if (response.data == SUCCESS_CODE) {
            window.location.href = WWW + "/results";
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }
  });
}

function redirectSource() {
  window.open(
    "https://github.com/Integrative-Transcriptomics/MUSIAL",
    "_blank"
  );
}

function redirectHelp() {
  window.location.href = WWW + "/help";
}
