SUCCESS_CODE = ""; // Code returned by the server for succ. requests.
FAILURE_CODE = ""; // Code returned by the server for faulty requests.
SESSION_CODE_NONE = ""; // Code indicating no active session.
SESSION_CODE_ACTIVE = ""; // Code indicating an active session.
SESSION_CODE_FAILED = ""; // Code indicating a failed session.
RESULT_KEY = ""; // Server session key to access results.
_URL = ""; // URL to access server.

/**
 * Initialize global application settings.
 */
function init() {
  // Store server response keys at client side.
  SUCCESS_CODE = API_PARAMETERS["SUCCESS_CODE"];
  FAILURE_CODE = API_PARAMETERS["FAILURE_CODE"];
  SESSION_CODE_NONE = API_PARAMETERS["SESSION_CODE_NONE"];
  SESSION_CODE_ACTIVE = API_PARAMETERS["SESSION_CODE_ACTIVE"];
  SESSION_CODE_FAILED = API_PARAMETERS["SESSION_CODE_FAILED"];
  RESULT_KEY = API_PARAMETERS["RESULT_KEY"];
  _URL = API_PARAMETERS["URL"];
  // Check for session status.
  sessionStatus();
  // Display main component.
  $("#menu")[0].style.display = "flex";
  $(".main")[0].style.display = "block";
}

/**
 * Displays a generic error message, if the MUSIAL web api returned an error code in the passed response.
 */
function displayError() {
  Swal.fire({
    iconHtml: `<i class="error-icon fa-duotone fa-triangle-exclamation"></i>`,
    title: "Error",
    confirmButtonColor: "#6d81ad",
    color: "#747474",
    background: "#fafafcd9",
    backdrop: `
            rgba(96, 113, 150, 0.4)
            left top
            no-repeat
          `,
    html:
      `
        <div class="remark secondary text-left">
            An error occurred. Please check your input/session data.
            You can access the server log <a href='` +
      _URL +
      `/log' target='_blank'>here</a>.
            If you cannot solve your problem, feel free to <a href='https://github.com/Integrative-Transcriptomics/MUSIAL-WEB/issues' target='_blank'>open an issue on GitHub</a>.
        </div>
      `,
  });
}

/**
 * Displays the specific warning text as an alert.
 *
 * @param {String} text Message to display in the alert.
 */
function displayWarning(text) {
  Swal.fire({
    iconHtml: `<i class="warning-icon fa-duotone fa-circle-info"></i>`,
    title: "Warning",
    confirmButtonColor: "#6d81ad",
    text: text,
  });
}

/**
 * Displays an error message, if the specified response yields a failure code as data.
 *
 * @param {JSON} response JSON format response of the MUSIAL web api.
 */
function handleResponse(response) {
  if (response.code == FAILURE_CODE) {
    displayError();
  }
}

/**
 * Provides a blob as a downloadable file.
 *
 * @param {Blob} blob The file-like blob object whose content is stored.
 * @param {String} name The name of the file to store the specified blob.
 */
function downloadBlob(blob, name) {
  var download_link = document.createElement("a");
  download_link.href = window.URL.createObjectURL(new Blob([blob]));
  download_link.download = name;
  download_link.click();
  download_link.remove();
}

/**
 * Check for an active session and colorize the session indicator accordingly.
 */
function sessionStatus() {
  axios
    .get(_URL + "/session/status")
    .then((response) => {
      switch (String(response.data.code)) {
        case SESSION_CODE_ACTIVE:
          $("#menu-active-session-indicator")[0].classList =
            "p-2 fa-duotone fa-hexagon-check";
          break;
        case SESSION_CODE_FAILED:
          $("#menu-active-session-indicator")[0].classList =
            "p-2 fa-duotone fa-hexagon-exclamation";
          break;
        case SESSION_CODE_NONE:
          $("#menu-active-session-indicator")[0].classList =
            "p-2 fa-duotone fa-hexagon";
          break;
      }
    })
    .catch((error) => {
      displayError(error.message);
    });
}

/**
 * Converts a html string into a html node.
 *
 * @param {String} html String content of the html element to generate.
 * @returns The html Node object defined by the specified string content.
 */
function htmlToElement(html) {
  var template = document.createElement("template");
  html = html.trim();
  template.innerHTML = html;
  return template.content.firstChild;
}

/**
 * Displays a toast message at the bottom of the page.
 *
 * @param {String} text Content to display.
 * @param {Number} timeout Timeout to hide the toast.
 */
function displayToast(text, timeout) {
  Metro.toast.create(text, () => {}, timeout, "custom-toast");
}
