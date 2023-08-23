/**
 * Returns the example dataset from the webserver as download.
 */
function getExampleData() {
  axios
    .get(_URL + "/example_data", { responseType: "blob" })
    .then((response) => {
      handleResponse(response);
      downloadBlob(response.data, "example_data.zip");
    })
    .catch((error) => {
      displayError(error.message);
    });
}

/**
 * Starts the example session at the webserver.
 */
function startExampleSession() {
  axios
    .get(_URL + "/example_session")
    .then((response) => {
      handleResponse(response);
      if (response.data == SUCCESS_CODE) {
        window.location.href = _URL + "/results";
      }
    })
    .catch((error) => {
      displayError(error.message);
    });
}

/**
 * Redirect to the source code of the project in a new tab.
 */
function redirectSource() {
  window.open(
    "https://github.com/Integrative-Transcriptomics/MUSIAL",
    "_blank"
  );
}

/**
 * Redirect to the help page of the project in a new tab.
 */
function redirectHelp() {
  window.open(_URL + "/help", "_blank");
}
