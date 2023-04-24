function getExampleData() {
  axios
    .get(WWW + "/example_data", { responseType: "blob" })
    .then((response) => {
      handleResponseCode(response);
      downloadBlob(response.data, "example_data.zip");
    });
}

function startExampleSession() {
  axios
    .get(WWW + "/example_session")
    .then((response) => {
      handleResponseCode(response);
      if (response.data == SUCCESS_CODE) {
        window.location.href = WWW + "/results";
      }
    })
    .catch((error) => {
      handleError(error);
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
