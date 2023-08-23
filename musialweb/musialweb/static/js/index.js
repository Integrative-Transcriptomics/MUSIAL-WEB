SUCCESS_CODE = ""; // Code returned by the server for succ. requests.
FAILURE_CODE = ""; // Code returned by the server for faulty requests.
SESSION_CODE_NONE = ""; // Code indicating no active session.
SESSION_CODE_ACTIVE = ""; // Code indicating an active session.
SESSION_CODE_FAILED = ""; // Code indicating a failed session.
RESULT_KEY = ""; // Server session key to access results.
LOG_KEY = ""; // Server session key to access application log.
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
  LOG_KEY = API_PARAMETERS["LOG_KEY"];
  _URL = API_PARAMETERS["URL"];
  // Check for session status.
  sessionStatus();
  // Display main component.
  $("#menu")[0].style.display = "flex";
  $(".main")[0].style.display = "block";
  // Definition of function to retrieve application log.
  $("#menu-active-session-indicator").on("click", () => {
    axios
      .get(_URL + "/log")
      .then((response) => {
        let text = "";
        if (response.data == FAILURE_CODE) {
          text = `No application log was retrievable from our server. This may be caused by:
          <ul>
            <li>No log data being stored for your session.</li>
            <li>Your session was deleted.</li>
            <li>You have started the example session.</li>
          </ul>`;
        } else {
          console.log(response);
          text = response.data[LOG_KEY];
        }
        Swal.fire({
          iconHtml: `<i style="color: #6d81ad;" class="fa-duotone fa-notebook fa-lg"></i>`,
          title: "Application Log",
          html:
            `
          <div class="p-2 text-ultralight text-left" style="white-space: pre-line; border-radius: 4px; background-color: #cbd0e0;">
          ` +
            text +
            `
          </div>
          `,
          width: "50vw",
          padding: "0.5em",
          position: "center",
          showCancelButton: false,
          grow: true,
          heightAuto: true,
          confirmButtonColor: "#6d81ad",
          confirmButtonText: "Close",
          color: "#747474",
          background: "#fafafcd9",
          backdrop: `
            rgba(239, 240, 248, 0.1)
            left top
            no-repeat
          `,
        });
      })
      .catch((error) => {
        displayError(error.message);
      });
  });
}

/**
 * Displays a generic error message, if the MUSIAL web api returned an error code in the passed response.
 *
 * @param {String} text Optional text to display.
 */
function displayError(text) {
  const showText = true;
  if (typeof text === "undefined") {
    showText = false;
  }
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
            You can access the server log by clicking the <i class="fa-duotone fa-hexagon" style="color: #fe4848;"></i> icon.
            If you cannot solve your problem, feel free to <a href='https://github.com/Integrative-Transcriptomics/MUSIAL-WEB/issues' target='_blan'>open an issue</a>.
        </div>
      ` + showText
        ? `<div class="remark secondary text-left"><span class="input-info-tag">LOG:</span><br>` +
          text +
          `</div>`
        : ``,
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
  if (response.data == FAILURE_CODE) {
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
    .get(_URL + "/session_status")
    .then((response) => {
      switch (String(response.data)) {
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

/**
 * Deprecated method.
 *
 * @param {String} text Text to display by the loader animation.
 * @param {Number} timeout Timeout of the loader animation in ms.
 */
function displayLoader(text, timeout) {
  var loaderContainer = document.createElement("div");
  loaderContainer.id = "loader-container";
  loaderContainer.innerHTML =
    `<img src="` +
    LOADING_GIF +
    `" style="height: 100px; width: 100px; pointer-events: none; user-select: none;">`;
  loaderContainer.style.cssText =
    "position:absolute; left:1vh; bottom:1vh; width:100px; height:100px; opacity:1.0; z-index:10; background: transparent;";
  document.body.appendChild(loaderContainer);
  Metro.toast.create(
    `<small>` + text + `</small>`,
    () => {
      hideLoader();
    },
    timeout,
    "custom-toast"
  );
}

/**
 * Deprecated method.
 */
function hideLoader() {
  $("#loader-container")[0].remove();
  $(".loader-toast")[0].remove();
}
