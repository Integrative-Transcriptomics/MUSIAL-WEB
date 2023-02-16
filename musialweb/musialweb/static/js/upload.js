var isReferenceGenome = false;
var isReferenceFeatures = false;
var isSamples = false;
var isFeatures = false;
var canSubmit = false;
var inferProteoforms = true;
var specifiedPdbFiles = [];
var specifiedSamplesMeta = {};
var specifiedFeaturesMeta = {};
var hasSession = false;
var request = {
  minCoverage: 5,
  minHomFrequency: 90,
  minHetFrequency: 45,
  maxHetFrequency: 55,
  minQuality: 30,
  referenceFASTA: "",
  referenceGFF: "",
  outputFile: "",
  samples: {},
  features: {},
  genomeAnalysis: true,
  excludedPositions: {},
};

$("#input-reference-genome").on("change", function (event) {
  request.referenceFASTA = $("#input-reference-genome")[0].files[0];
  if (request.referenceFASTA !== undefined) {
    isReferenceGenome = true;
  } else {
    isReferenceGenome = false;
  }
  isReferenceGenome = true;
  checkCanSubmit();
});

$("#input-samples-files").on("change", function (event) {
  request.samples = $("#input-samples-files")[0].files;
  if (request.samples !== undefined) {
    isSamples = true;
  } else {
    isSamples = false;
  }
  checkCanSubmit();
});

$("#input-samples-meta").on("change", function (event) {
  $("#input-samples-meta").parse({
    config: {
      complete: function (results, _) {
        specifiedSamplesMeta = {};
        let header = results.data[0].slice(1);
        for (let rowData of results.data.slice(1)) {
          specifiedSamplesMeta[rowData[0]] = {};
          header.forEach((columnName, index) => {
            specifiedSamplesMeta[rowData[0]][columnName] = rowData[index + 1];
          });
        }
      },
    },
  });
});

$("#input-features-file").on("change", function (event) {
  request.referenceGFF = $("#input-features-file")[0].files[0];
  if (request.referenceGFF !== undefined) {
    isReferenceFeatures = true;
  } else {
    isReferenceFeatures = false;
  }
  checkCanSubmit();
});

$("#input-features-meta").on("change", function (event) {
  $("#input-features-meta").parse({
    config: {
      complete: function (results, _) {
        specifiedFeaturesMeta = {};
        let header = results.data[0].slice(1);
        for (let rowData of results.data.slice(1)) {
          specifiedFeaturesMeta[rowData[0]] = {};
          header.forEach((columnName, index) => {
            specifiedFeaturesMeta[rowData[0]][columnName] = rowData[index + 1];
          });
        }
      },
    },
  });
});

$("#input-features-proteins").on("change", function (event) {
  specifiedPdbFiles = $("#input-features-proteins")[0].files;
});

$("#input-infer-proteoforms").on("change", function (event) {
  inferProteoforms = $("#input-infer-proteoforms").is(":checked");
});

$("#input-reference-genome-excluded-positions").on("change", function (event) {
  request.excludedPositions = {};
  if (!$("#input-reference-genome-excluded-positions")[0].value) {
    return;
  }
  let text = $("#input-reference-genome-excluded-positions")[0].value.split(
    ";"
  );
  for (let entry of text) {
    let splitEntry = entry.split(":");
    if (!(splitEntry.length == 2)) {
      continue;
    }
    let contig = entry.split(":")[0];
    let positions = entry.split(":")[1].split(",");
    if (
      /^[a-zA-Z\_\-\.]+$/.test(contig) &&
      positions.every((p) => {
        return /^[0-9]+$/.test(p);
      })
    ) {
      request.excludedPositions[contig] = positions.map((p) => parseInt(p));
    }
  }
});

$("#input-features-list").on("change", function (event) {
  let specifiedFeatures = undefined;
  let text = $("#input-features-list")[0].value.split(",");
  if (text == "") {
    request.genomeAnalysis = true;
    checkCanSubmit();
    return;
  } else {
    request.genomeAnalysis = false;
  }
  if (
    text.every((entry) => {
      return /^[a-zA-Z\_\-]+\=[a-zA-Z0-9\_\-]+$/.test(entry);
    })
  ) {
    specifiedFeatures = new Set(
      $("#input-features-list")[0]
        .value.split(",")
        .filter((entry) => entry !== "")
    );
  }
  if (specifiedFeatures !== undefined && specifiedFeatures.size > 0) {
    request.features = Array.from(specifiedFeatures);
  } else {
    request.features = undefined;
  }
  if (request.features !== undefined) {
    isFeatures = true;
  } else {
    isFeatures = false;
  }
  checkCanSubmit();
});

$("#input-parameter-min-coverage").on("change", function (event) {
  let oldValue = request.minCoverage;
  let newValue = undefined;
  let cancel = () => {
    displayWarningPopup(
      "Minimal variant call coverage is expected to be an integer greater than 0."
    );
    $("#input-parameter-min-coverage")[0].value = oldValue;
  };
  try {
    newValue = parseInt($("#input-parameter-min-coverage")[0].value);
  } catch (error) {
    cancel();
  }
  if (newValue > 0) {
    request.minCoverage = newValue;
    $("#input-parameter-min-coverage")[0].value = request.minCoverage;
  } else {
    cancel();
  }
});

$("#input-parameter-min-quality").on("change", function (event) {
  let oldValue = request.minQuality;
  let newValue = undefined;
  let cancel = () => {
    displayWarningPopup(
      "Minimal variant call quality is expected to be an integer greater than 0."
    );
    $("#input-parameter-min-quality")[0].value = oldValue;
  };
  try {
    newValue = parseInt($("#input-parameter-min-quality")[0].value);
  } catch (error) {
    cancel();
  }
  if (newValue > 0) {
    request.minQuality = newValue;
    $("#input-parameter-min-quality")[0].value = request.minQuality;
  } else {
    cancel();
  }
});

$("#input-parameter-min-hom-frequency").on("change", function (event) {
  let oldValue = request.minHomFrequency;
  let newValue = undefined;
  let cancel = () => {
    displayWarningPopup(
      "Minimal homozygous variant call frequency has to be an integer between 0 and 100."
    );
    $("#input-parameter-min-hom-frequency")[0].value = oldValue;
  };
  try {
    newValue = parseInt($("#input-parameter-min-hom-frequency")[0].value);
  } catch (error) {
    cancel();
  }
  if (newValue >= 0 && newValue <= 100) {
    request.minHomFrequency = newValue;
    $("#input-parameter-min-hom-frequency")[0].value = request.minHomFrequency;
  } else {
    cancel();
  }
});

$("#input-parameter-min-het-frequency").on("change", function (event) {
  let oldValue = request.minHetFrequency;
  let newValue = undefined;
  let cancel = () => {
    displayWarningPopup(
      "Minimal heterozygous variant call frequency has to be an integer between 0 and 100 and less than the maximal heterozygous variant call frequency."
    );
    $("#input-parameter-min-het-frequency")[0].value = oldValue;
  };
  try {
    newValue = parseInt($("#input-parameter-min-het-frequency")[0].value);
  } catch (error) {
    cancel();
  }
  if (newValue >= 0 && newValue <= 100 && newValue <= request.maxHetFrequency) {
    request.minHetFrequency = newValue;
    $("#input-parameter-min-het-frequency")[0].value = request.minHetFrequency;
  } else {
    cancel();
  }
});

$("#input-parameter-max-het-frequency").on("change", function (event) {
  let oldValue = request.maxHetFrequency;
  let newValue = undefined;
  let cancel = () => {
    displayWarningPopup(
      "Maximal heterozygous variant call frequency has to be an integer between 0 and 100 and greater than the minimal heterozygous variant call frequency."
    );
    $("#input-parameter-max-het-frequency")[0].value = oldValue;
  };
  try {
    newValue = parseFloat($("#input-parameter-max-het-frequency")[0].value);
  } catch (error) {
    cancel();
  }
  if (newValue >= 0 && newValue <= 100 && newValue >= request.minHetFrequency) {
    request.maxHetFrequency = newValue;
    $("#input-parameter-max-het-frequency")[0].value = request.maxHetFrequency;
  } else {
    cancel();
  }
});

function resetForm() {
  for (let fileInputId of [
    "input-reference-genome",
    "input-samples-files",
    "input-samples-meta",
    "input-features-file",
    "input-features-meta",
    "input-features-proteins",
  ]) {
    Metro.getPlugin(document.getElementById(fileInputId), "file").clear();
  }
  $("#input-features-list")[0].value = null;
  $("#input-reference-genome-excluded-positions")[0].value = null;
  isReferenceGenome = false;
  isReferenceFeatures = false;
  isSamples = false;
  isFeatures = false;
  specifiedPdbFiles = [];
  specifiedSamplesMeta = {};
  specifiedFeaturesMeta = {};
  request.referenceFASTA = "";
  request.referenceGFF = "";
  request.outputFile = "";
  request.samples = {};
  request.features = {};
  checkCanSubmit();
}

function checkCanSubmit() {
  if (
    isReferenceGenome &&
    isReferenceFeatures &&
    isSamples &&
    (isFeatures || request.genomeAnalysis)
  ) {
    $("#upload-data-button")[0].disabled = false;
    canSubmit = true;
  } else {
    $("#upload-data-button")[0].disabled = true;
    canSubmit = false;
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    var fileReader = new FileReader();
    fileReader.onload = (event) => {
      resolve(event.target.result);
    };
    fileReader.onerror = (error) => reject(error);
    fileReader.readAsText(file);
  });
}

function startExampleSession() {
  axios
    .get(WWW + "/example_session")
    .then((response) => {
      handleResponseCode(response);
      if (response.data == SUCCESS_CODE) {
        Swal.fire({
          icon: "success",
          title: "Success",
          confirmButtonColor: "#6d81ad",
          html:
            `You can view the example session results at the <a href="` +
            WWW +
            `/results">RESULTS</a> page.`,
          color: "#747474",
          background: "#fafafcd9",
          backdrop: `
                  rgba(239, 240, 248, 0.1)
                  left top
                  no-repeat
                `,
        }).then((_) => {
          init();
        });
      }
    })
    .catch((error) => {
      handleError(error);
    });
}

async function submit() {
  if (canSubmit) {
    document.body.className = "wait";
    let sampleFiles = request.samples;
    request.samples = {};
    for (let sampleFile of sampleFiles) {
      let sampleName = sampleFile.name.split(".")[0];
      request.samples[sampleName] = {
        vcfFile: null,
        annotations:
          sampleName in specifiedSamplesMeta
            ? specifiedSamplesMeta[sampleName]
            : {},
      };
      await readFile(sampleFile).then((response) => {
        request.samples[sampleName].vcfFile = response;
      });
    }
    let referenceFastaFile = request.referenceFASTA;
    await readFile(referenceFastaFile).then((response) => {
      request.referenceFASTA = response;
    });
    let referenceGffFile = request.referenceGFF;
    await readFile(referenceGffFile).then((response) => {
      request.referenceGFF = response;
    });
    let specifiedFeatures = request.features;
    request.features = {};
    if (specifiedFeatures.length > 0) {
      for (let specifiedFeature of specifiedFeatures) {
        let matchAttribute = specifiedFeature.split("=")[0];
        let matchValue = specifiedFeature.split("=")[1];
        request.features[matchValue] = {
          annotations:
            matchValue in specifiedFeaturesMeta
              ? specifiedFeaturesMeta[matchValue]
              : {},
        };
        request.features[matchValue]["MATCH_" + matchAttribute] = matchValue;
        let matchedPdbFiles = [...specifiedPdbFiles].filter(
          (file) => file.name.split(".")[0] === matchValue
        );
        if (matchedPdbFiles.length > 0) {
          await readFile(matchedPdbFiles[0]).then((response) => {
            request.features[matchValue]["pdbFile"] = response;
          });
        } else {
          request.features[matchValue]["isCodingSequence"] = inferProteoforms;
        }
      }
    }
    request.minHomFrequency = request.minHomFrequency / 100;
    request.minHetFrequency = request.minHetFrequency / 100;
    request.maxHetFrequency = request.maxHetFrequency / 100;
    document.body.className = "";
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
          <li>Your data will not be accessible to other people.</li>
          <li>No personalized data is collected or shared with third parties and you will not be tracked by this cookie.</li>
          <li>The cookie will expire after five days and your data will be deleted.</li>
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
      confirmButtonText: "Consent and Submit Request",
      allowOutsideClick: false,
      allowEscapeKey: false,
      backdrop: `
          rgba(239, 240, 248, 0.1)
          left top
          no-repeat
      `,
    }).then((result) => {
      document.body.className = "wait";
      if (result.isConfirmed) {
        displayLoader(
          `Your request is being processed! You will be forwarded when the results are ready`
        );
        axios
          .post(WWW + "/start_session", pako.deflate(JSON.stringify(request)), {
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "zlib",
            },
          })
          .then((response) => {
            handleResponseCode(response);
            if (response.data == SUCCESS_CODE) {
              window.location.href = WWW + "/results";
            }
          })
          .catch((error) => {
            handleError(error);
          })
          .finally((_) => {
            document.body.className = "";
            resetForm();
          });
      } else if (result.isDenied) {
        document.body.className = "";
        resetForm();
      }
    });
  }
}
