/**
 * Returns the example dataset from the webserver as download.
 */
function getExampleData() {
  axios
    .get(_URL + "/example/data")
    .then((response) => {
      if (assessResponse(response)) {
        downloadBlob(response.data, "example_data.zip");
      }
    })
    .catch((error) => {
      throwError(error.message);
    });
}

/**
 * Starts the example session at the webserver.
 */
function startExampleSession() {
  axios
    .get(_URL + "/example/session")
    .then((response) => {
      if (assessResponse(response)) {
        window.location.href = _URL + "/results";
      }
    })
    .catch((error) => {
      throwError(error.message);
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
