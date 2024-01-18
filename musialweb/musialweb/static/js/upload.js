/* MUSIAL (Webserver) | Simon Hackl - simon.hackl@uni-tuebingen.de | v1.2.0 | GPL-3.0 license | github.com/Integrative-Transcriptomics/MUSIAL-WEB */

// Definition of constants.
var PASS_REFERENCE_SEQUENCE = false;
var PASS_REFERENCE_FEATURES = false;
var PASS_SAMPLES = false;
var PASS_FEATURES = false;
var CAN_SUBMIT = false;
var PROTEOFORM_ANALYSIS = true;
var PDB_FILES = [];
var SAMPLE_META_DATA = {};
var FEATURES_META_DATA = {};
var HAS_SESSION = false;
var REQUEST = {
  minimalCoverage: 5,
  minimalHomozygousFrequency: 90,
  minimalHeterozygousFrequency: 45,
  maximalHeterozygousFrequency: 55,
  minimalQuality: 30,
  referenceSequenceFile: undefined,
  referenceFeaturesFile: undefined,
  output: "",
  samples: {},
  features: [],
  excludedPositions: {},
};

// Definition of change observers to track if users can submit.
$("#input-reference-genome").on("change", function (event) {
  REQUEST.referenceSequenceFile = $("#input-reference-genome")[0].files[0];
  if (REQUEST.referenceSequenceFile !== undefined) {
    PASS_REFERENCE_SEQUENCE = true;
  } else {
    PASS_REFERENCE_SEQUENCE = false;
  }
  PASS_REFERENCE_SEQUENCE = true;
  checkCanSubmit();
});

$("#input-samples-files").on("change", function (event) {
  REQUEST.samples = $("#input-samples-files")[0].files;
  if (REQUEST.samples !== undefined) {
    PASS_SAMPLES = true;
  } else {
    PASS_SAMPLES = false;
  }
  checkCanSubmit();
});

$("#input-samples-meta").on("change", function (event) {
  $("#input-samples-meta").parse({
    config: {
      complete: function (results, _) {
        SAMPLE_META_DATA = {};
        let header = results.data[0].slice(1);
        for (let rowData of results.data.slice(1)) {
          SAMPLE_META_DATA[rowData[0]] = {};
          header.forEach((columnName, index) => {
            SAMPLE_META_DATA[rowData[0]][columnName] = rowData[index + 1];
          });
        }
      },
    },
  });
});

$("#input-features-file").on("change", function (event) {
  REQUEST.referenceFeaturesFile = $("#input-features-file")[0].files[0];
  if (REQUEST.referenceFeaturesFile !== undefined) {
    PASS_REFERENCE_FEATURES = true;
  } else {
    PASS_REFERENCE_FEATURES = false;
  }
  checkCanSubmit();
});

$("#input-features-meta").on("change", function (event) {
  $("#input-features-meta").parse({
    config: {
      complete: function (results, _) {
        FEATURES_META_DATA = {};
        let header = results.data[0].slice(1);
        for (let rowData of results.data.slice(1)) {
          FEATURES_META_DATA[rowData[0]] = {};
          header.forEach((columnName, index) => {
            FEATURES_META_DATA[rowData[0]][columnName] = rowData[index + 1];
          });
        }
      },
    },
  });
});

$("#input-features-proteins").on("change", function (event) {
  PDB_FILES = $("#input-features-proteins")[0].files;
});

$("#input-infer-proteoforms").on("change", function (event) {
  PROTEOFORM_ANALYSIS = $("#input-infer-proteoforms").is(":checked");
});

$("#input-parameter-min-coverage").on("change", function (event) {
  let oldValue = REQUEST.minimalCoverage;
  let newValue = undefined;
  let cancel = () => {
    alertWarning(
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
    REQUEST.minimalCoverage = newValue;
    $("#input-parameter-min-coverage")[0].value = REQUEST.minimalCoverage;
  } else {
    cancel();
  }
});

$("#input-parameter-min-quality").on("change", function (event) {
  let oldValue = REQUEST.minimalQuality;
  let newValue = undefined;
  let cancel = () => {
    alertWarning(
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
    REQUEST.minimalQuality = newValue;
    $("#input-parameter-min-quality")[0].value = REQUEST.minimalQuality;
  } else {
    cancel();
  }
});

$("#input-parameter-min-hom-frequency").on("change", function (event) {
  let oldValue = REQUEST.minimalHomozygousFrequency;
  let newValue = undefined;
  let cancel = () => {
    alertWarning(
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
    REQUEST.minimalHomozygousFrequency = newValue;
    $("#input-parameter-min-hom-frequency")[0].value =
      REQUEST.minimalHomozygousFrequency;
  } else {
    cancel();
  }
});

$("#input-parameter-min-het-frequency").on("change", function (event) {
  let oldValue = REQUEST.minimalHeterozygousFrequency;
  let newValue = undefined;
  let cancel = () => {
    alertWarning(
      "Minimal heterozygous variant call frequency has to be an integer between 0 and 100 and less than the maximal heterozygous variant call frequency."
    );
    $("#input-parameter-min-het-frequency")[0].value = oldValue;
  };
  try {
    newValue = parseInt($("#input-parameter-min-het-frequency")[0].value);
  } catch (error) {
    cancel();
  }
  if (
    newValue >= 0 &&
    newValue <= 100 &&
    newValue <= REQUEST.maximalHeterozygousFrequency
  ) {
    REQUEST.minimalHeterozygousFrequency = newValue;
    $("#input-parameter-min-het-frequency")[0].value =
      REQUEST.minimalHeterozygousFrequency;
  } else {
    cancel();
  }
});

$("#input-parameter-max-het-frequency").on("change", function (event) {
  let oldValue = REQUEST.maximalHeterozygousFrequency;
  let newValue = undefined;
  let cancel = () => {
    alertWarning(
      "Maximal heterozygous variant call frequency has to be an integer between 0 and 100 and greater than the minimal heterozygous variant call frequency."
    );
    $("#input-parameter-max-het-frequency")[0].value = oldValue;
  };
  try {
    newValue = parseFloat($("#input-parameter-max-het-frequency")[0].value);
  } catch (error) {
    cancel();
  }
  if (
    newValue >= 0 &&
    newValue <= 100 &&
    newValue >= REQUEST.minimalHeterozygousFrequency
  ) {
    REQUEST.maximalHeterozygousFrequency = newValue;
    $("#input-parameter-max-het-frequency")[0].value =
      REQUEST.maximalHeterozygousFrequency;
  } else {
    cancel();
  }
});

/**
 * Sets a change observer for the feature list input.
 *
 * The function is called after the DOM generation of the resp. tag input and initializes
 * a mutation observer of the parent node. This tracks all changes of added or deleted tags.
 */
function observeFeaturesList() {
  new MutationObserver(() => {
    let values = $("#input-features-list")[0]
      .value.split(",")
      .filter((e) => e != "");

    let features = new Set();
    if (
      values.every((entry) => {
        return /^[a-zA-Z0-9\_\-]+\s[a-zA-Z0-9\_\-]+$/.test(entry);
      })
    ) {
      features = new Set(values);
    }
    if (features.size > 0) {
      REQUEST.features = Array.from(features);
      PASS_FEATURES = true;
    } else {
      REQUEST.features = [];
      PASS_FEATURES = false;
    }
    checkCanSubmit();
  }).observe($("#input-features-list")[0].parentNode, {
    subtree: true,
    childList: true,
  });
}

/**
 * Resets all input forms.
 */
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
  Metro.getPlugin("#input-features-list", "taginput").clear();
  Metro.getPlugin(
    "#input-reference-genome-excluded-positions",
    "taginput"
  ).clear();
  PASS_REFERENCE_SEQUENCE = false;
  PASS_REFERENCE_FEATURES = false;
  PASS_SAMPLES = false;
  PASS_FEATURES = false;
  PDB_FILES = [];
  SAMPLE_META_DATA = {};
  FEATURES_META_DATA = {};
  REQUEST.referenceSequenceFile = "";
  REQUEST.referenceFeaturesFile = "";
  REQUEST.output = "";
  REQUEST.samples = {};
  REQUEST.features = {};
  checkCanSubmit();
}

/**
 * Check whether users can submit their request.
 */
function checkCanSubmit() {
  if (
    PASS_REFERENCE_SEQUENCE &&
    PASS_REFERENCE_FEATURES &&
    PASS_SAMPLES &&
    PASS_FEATURES &&
    $("#loader-container").length == 0
  ) {
    $("#upload-data-button")[0].disabled = false;
    CAN_SUBMIT = true;
  } else {
    $("#upload-data-button")[0].disabled = true;
    CAN_SUBMIT = false;
  }
}

/**
 * Returns the content of a client side file as a string.
 *
 * @param {String} file Client side local file path.
 * @returns Promise of the file content.
 */
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

/**
 * Submits the user request.
 */
async function submit() {
  if (CAN_SUBMIT) {
    document.body.style.cursor = "wait";
    displayNotification(
      "Your data is being pre-processed. Your request will subsequently be transmitted to the server."
    );
    $("#upload-data-button")[0].disabled = true;
    CAN_SUBMIT = false;
    /*
    Process sample input:
    Transforms all passed variant call format files into sample entries wrt. the MUSIAL build schema.
    The contents of the single vcf files are parsed at the client side and stored in the resp. entry.
     */
    let sampleFiles = REQUEST.samples;
    REQUEST.samples = {};
    for (let sampleFile of sampleFiles) {
      let sampleName = sampleFile.name.split(".")[0];
      REQUEST.samples[sampleName] = {
        vcfFile: null,
        annotations:
          sampleName in SAMPLE_META_DATA ? SAMPLE_META_DATA[sampleName] : {},
      };
      await readFile(sampleFile).then((response) => {
        REQUEST.samples[sampleName].vcfFile = response;
      });
    }
    /*
    Process reference sequence input:
    Parses the specified reference sequence at the client side and store its content in the resp. entry.
    Validates and transforms all specified positions to exclude tags into single position lists per entry.
     */
    let referenceSequenceFile = REQUEST.referenceSequenceFile;
    await readFile(referenceSequenceFile).then((response) => {
      REQUEST.referenceSequenceFile = response;
    });
    REQUEST.excludedPositions = {};
    let excludedPositionsTags = Metro.getPlugin(
      "#input-reference-genome-excluded-positions",
      "taginput"
    ).val();
    for (let excludedPositionsTag of excludedPositionsTags) {
      let excludedPositionsData = excludedPositionsTag.split(" ");
      if (!(excludedPositionsData.length == 2)) {
        continue;
      }
      let contig = excludedPositionsData[0];
      let positions = excludedPositionsData[1].split(",");
      if (
        /^[a-zA-Z0-9\_\-\.]+$/.test(contig) &&
        positions.every((p) => {
          return /^([0-9]+|[0-9]+\-[0-9]+)$/.test(p);
        })
      ) {
        positions = positions.filter((p) => {
          if (p.includes("-")) {
            let limits = p.split("-");
            let start = parseInt(limits[0]);
            let end = parseInt(limits[1]);
            return start <= end;
          } else {
            return true;
          }
        });
        if (!REQUEST.excludedPositions.hasOwnProperty(contig)) {
          REQUEST.excludedPositions[contig] = [];
        }
        for (let position of positions) {
          if (position.includes("-")) {
            let limits = position.split("-");
            let start = parseInt(limits[0]);
            let end = parseInt(limits[1]);
            for (let i = start; i <= end; i++) {
              REQUEST.excludedPositions[contig].push(i);
            }
          } else {
            REQUEST.excludedPositions[contig].push(parseInt(position));
          }
        }
        REQUEST.excludedPositions[contig] = [
          ...new Set(REQUEST.excludedPositions[contig]),
        ];
      }
    }
    /*
    Process reference feature input:
    Parses the specified reference sequence annotation at the client side and store its content in the resp. entry.
    Validates and transforms all specified feature tags into proper build configuration entries.
     */
    let referenceFeaturesFile = REQUEST.referenceFeaturesFile;
    await readFile(referenceFeaturesFile).then((response) => {
      REQUEST.referenceFeaturesFile = response;
    });
    let features = REQUEST.features;
    REQUEST.features = {};
    for (let feature of features) {
      let matchKey = feature.split(" ")[0];
      let matchValue = feature.split(" ")[1];
      REQUEST.features[matchValue] = {
        annotations:
          matchValue in FEATURES_META_DATA
            ? FEATURES_META_DATA[matchValue]
            : {},
      };
      REQUEST.features[matchValue]["match_" + matchKey] = matchValue;
      let matchedPdbFiles = [...PDB_FILES].filter(
        (file) => file.name.split(".")[0] === matchValue
      );
      if (matchedPdbFiles.length > 0) {
        await readFile(matchedPdbFiles[0]).then((response) => {
          REQUEST.features[matchValue]["pdbFile"] = response;
        });
      } else {
        REQUEST.features[matchValue]["coding"] = PROTEOFORM_ANALYSIS;
      }
    }
    /*
    Transform the specified variant call filter parameters to the correct format.
    */
    REQUEST.minimalHomozygousFrequency =
      REQUEST.minimalHomozygousFrequency / 100;
    REQUEST.minimalHeterozygousFrequency =
      REQUEST.minimalHeterozygousFrequency / 100;
    REQUEST.maximalHeterozygousFrequency =
      REQUEST.maximalHeterozygousFrequency / 100;
    // Send the request to the server.
    document.body.style.cursor = "default";
    removeNotification();
    displayNotification(
      "Request has been sent to the server. You will be forwarded automatically."
    );
    const deflated_request = pako.deflate(JSON.stringify(REQUEST));
    log_interaction("Submit Data.");
    axios
      .post(_URL + "/session/start", deflated_request, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Encoding": "zlib",
        },
      })
      .then((response) => {
        if (assessResponse(response)) {
          window.location.href = _URL + "/results";
        }
      })
      .catch((error) => {
        alertError(error.message);
      })
      .finally(() => {
        resetForm();
        removeNotification();
      });
  }
}
