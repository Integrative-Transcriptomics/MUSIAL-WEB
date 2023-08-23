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
  features: {},
  excludedPositions: {},
};

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

function observeFeatures(_, _, values) {
  parseFeaturesInput(values);
  if (REQUEST.features !== undefined) {
    PASS_FEATURES = true;
  } else {
    PASS_FEATURES = false;
  }
  checkCanSubmit();
}

function parseFeaturesInput(values) {
  let features = undefined;
  if (
    values.every((entry) => {
      return /^[a-zA-Z0-9\_\-]+\s[a-zA-Z0-9\_\-]+$/.test(entry);
    })
  ) {
    features = new Set(values);
  }
  if (features !== undefined && features.size > 0) {
    REQUEST.features = Array.from(features);
  } else {
    REQUEST.features = undefined;
  }
}

$("#input-parameter-min-coverage").on("change", function (event) {
  let oldValue = REQUEST.minimalCoverage;
  let newValue = undefined;
  let cancel = () => {
    displayWarning(
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
    displayWarning(
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
    displayWarning(
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
    displayWarning(
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
    displayWarning(
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

async function submit() {
  if (CAN_SUBMIT) {
    displayLoader(
      "Processing Request (You will be redirected once complete)",
      10e9
    );
    checkCanSubmit();
    document.body.className = "wait";
    // Process samples input.
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
    // Process reference sequence input.
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
    // Process reference sequence features.
    let referenceFeaturesFile = REQUEST.referenceFeaturesFile;
    await readFile(referenceFeaturesFile).then((response) => {
      REQUEST.referenceFeaturesFile = response;
    });
    parseFeaturesInput(
      Metro.getPlugin("#input-features-list", "taginput").val()
    );
    let features = REQUEST.features;
    REQUEST.features = {};
    if (features.length > 0) {
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
    }
    // Process call filter parameters.
    REQUEST.minimalHomozygousFrequency =
      REQUEST.minimalHomozygousFrequency / 100;
    REQUEST.minimalHeterozygousFrequency =
      REQUEST.minimalHeterozygousFrequency / 100;
    REQUEST.maximalHeterozygousFrequency =
      REQUEST.maximalHeterozygousFrequency / 100;
    document.body.className = "";
    axios
      .post(WWW + "/start_session", pako.deflate(JSON.stringify(REQUEST)), {
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
        hideLoader();
      });
  }
}
