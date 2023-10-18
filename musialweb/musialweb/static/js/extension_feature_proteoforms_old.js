const AMINO_ACID_ENCODING = {
  // Polar (positive), Basic
  H: 1, // HIS
  K: 2, // LYS
  R: 3, // ARG
  // Polar (negative), Acidic
  D: 4, // ASP
  E: 5, // GLU
  // Polar (neutral)
  S: 6, // SER
  T: 7, // THR
  N: 8, // ASN
  Q: 9, // GLN
  // Sulfur bridge forming
  C: 10, // CYS
  // Aromatic
  F: 11, // PHE
  W: 12, // TRP
  Y: 13, // TYR
  // Aliphatic
  A: 14, // ALA
  V: 15, // VAL
  L: 16, // LEU
  I: 17, // ILE
  M: 18, // MET
  P: 19, // PRO
  G: 20, // GLY
  // Other
  X: 21, // ANY
  "*": 22, // TER
  "-": 23, // Gap
};
const AMINO_ACID_DECODING = Object.assign(
  {},
  ...Object.entries(AMINO_ACID_ENCODING).map(([key, value]) => ({
    [value]: key,
  }))
);
const AMINO_ACID_DESIGNATION = {
  // Polar (positive), Basic
  H: "His (H)", // HIS
  K: "Lys (K)", // LYS
  R: "Arg (R)", // ARG
  // Polar (negative), Acidic
  D: "Asp (D)", // ASP
  E: "Glu (E)", // GLU
  // Polar (neutral)
  S: "Ser (S)", // SER
  T: "Thr (T)", // THR
  N: "Asn (N)", // ASN
  Q: "Glu (Q)", // GLN
  // Sulfur bridge forming
  C: "Cys (C)", // CYS
  // Aromatic
  F: "Phe (F)", // PHE
  W: "Trp (W)", // TRP
  Y: "Tyr (Y)", // TYR
  // Aliphatic
  A: "Ala (A)", // ALA
  V: "Val (V)", // VAL
  L: "Leu (L)", // LEU
  I: "Iso (I)", // ILE
  M: "Met (M)", // MET
  P: "Pro (P)", // PRO
  G: "Gly (G)", // GLY
  // Other
  X: "Any (X)", // ANY
  "*": "Ter.", // TER
  "-": "Gap", // Gap
  None: "None", // Insertion
};
const AMINO_ACID_COLOR = {
  // Polar (positive), Basic
  H: "#69b8e2", // HIS
  K: "#7ec2e7", // LYS
  R: "#94cceb", // ARG
  // Polar (negative), Acidic
  D: "#ff6670", // ASP
  E: "#ff8088", // GLU
  // Polar (neutral)
  S: "#8fb082", // SER
  T: "#9dba91", // THR
  N: "#abc4a1", // ASN
  Q: "#b9ceb1", // GLN
  // Sulfur bridge forming
  C: "#ffee80", // CYS
  // Aromatic
  F: "#b08ed7", // PHE
  W: "#bda1de", // TRP
  Y: "#a37bd1", // TYR
  // Aliphatic
  A: "#4d9099", // ALA
  V: "#55a0aa", // VAL
  L: "#66a9b2", // LEU
  I: "#77b3bb", // ILE
  M: "#88bcc3", // MET
  P: "#99c6cc", // PRO
  G: "#aacfd4", // GLY
  // Other
  X: "#a89471", // ANY
  "*": "#FF0099", // TER
  "-": "#3c3c3c", // Gap
};
var _STRUCTURE_VIEW; // 3DMol.js `viewer` instance.
var sequenceViewer; // EChart.js `echart` instance.
var observerSequenceViewer; // `ResizeObserver` instance to adjust width and height of `sequenceViewer`.
var positionViewer; // EChart.js `echart` instance.
var STATE = {
  sequenceViewerEChartOption: {
    title: [],
    grid: [
      {
        id: "GRID_VARIANTS_HEATMAP",
        top: "10%",
        bottom: "10%",
        left: "10%",
        right: "10%",
      },
      {
        id: "GRID_POSITION_VARIABILITY",
        top: "2%",
        bottom: "92.5%",
        left: "10%",
        right: "10%",
      },
      {
        id: "GRID_PROTEOFORM_PROPORTION",
        top: "10%",
        bottom: "10%",
        left: "91.5%",
        right: "5%",
      },
      {
        id: "GRID_CUSTOM_TRACKS",
        top: "0%",
        bottom: "100%",
        left: "50%",
        right: "50%",
        backgroundColor: "#fafafc",
      },
    ],
    tooltip: {
      trigger: "item",
      triggerOn: "click",
      formatter: null,
    },
    axisPointer: {
      link: {
        xAxisIndex: [0, 1],
      },
      triggerTooltip: false,
      triggerOn: "mousemove",
      show: true,
      label: {
        backgroundColor: "rgba(90, 90, 90, 0.8)",
        fontWeight: "bold",
        fontSize: 10,
        formatter: (d) => {
          if (d.axisDimension == "x" && d.axisIndex == 0) {
            return d.value;
          } else if (d.axisDimension == "x" && d.axisIndex == 1) {
            return "No. Variants " + d.seriesData[0].data[1];
          } else if (d.axisDimension == "y" && d.axisIndex == 0) {
            let proteoformKey =
              d.value == wtGeneLabel || d.value == wtProteoformLabel
                ? wtProteoformIdentifier
                : d.value;
            let proteoformNoSamples = DATA.proteoforms.hasOwnProperty(
              proteoformKey
            )
              ? DATA.proteoforms[proteoformKey].samples.length
              : 0;
            let proteoformSamplePercentage = (
              (proteoformNoSamples / STATE.NO_SAMPLES) *
              100
            ).toFixed(1);
            return d.value + " [" + proteoformSamplePercentage + "%]";
          } else {
            return d.value;
          }
        },
      },
    },
    xAxis: [
      {
        id: "XAXIS_VARIANTS_HEATMAP",
        type: "category",
        gridIndex: 0,
        data: [],
        splitLine: {
          show: true,
          interval: 0,
        },
        name: "Relative Position (wrt. Wild Type)",
        nameLocation: "center",
        nameGap: 25,
        nameTextStyle: {
          fontWeight: "bold",
        },
        axisTick: {
          alignWithLabel: true,
          interval: 0,
        },
      },
      {
        id: "XAXIS_POSITION_VARIABILITY",
        type: "category",
        gridIndex: 1,
        show: false,
        data: [],
      },
      {
        id: "XAXIS_PROTEOFORM_PROPORTION",
        min: 0.0,
        max: 1.0,
        type: "value",
        gridIndex: 2,
        minInterval: 0.5,
        show: true,
        data: [0.0, 1.0],
      },
      {
        id: "XAXIS_CUSTOM_TRACKS",
        type: "category",
        gridIndex: 3,
        show: false,
        data: [],
        axisPointer: {
          show: false,
        },
      },
    ],
    yAxis: [
      {
        id: "YAXIS_VARIANTS_HEATMAP",
        type: "category",
        gridIndex: 0,
        inverse: false,
        data: [],
        splitLine: {
          show: true,
          interval: 0,
        },
        name: "Proteoforms",
        nameLocation: "center",
        nameGap: 130,
        nameTextStyle: {
          fontWeight: "bold",
        },
        axisTick: {
          alignWithLabel: true,
          interval: 0,
        },
      },
      {
        id: "YAXIS_POSITION_VARIABILITY",
        type: "value",
        gridIndex: 1,
        inverse: false,
        axisTick: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        name: "No. Variants",
        nameLocation: "center",
        nameRotate: 0,
        nameGap: 40,
        nameTextStyle: {
          fontWeight: "bold",
        },
      },
      {
        id: "YAXIS_PROTEOFORM_PROPORTION",
        type: "category",
        gridIndex: 2,
        show: true,
        axisLabel: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        data: [],
        name: "Sample Proportion",
        nameLocation: "center",
        nameGap: -100,
        nameTextStyle: {
          fontWeight: "bold",
        },
      },
      {
        id: "YAXIS_CUSTOM_TRACKS",
        type: "category",
        gridIndex: 3,
        show: false,
        data: ["BottomTrack", "Spacer1", "MidTrack", "Spacer2", "TopTrack"],
        axisLabel: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        name: "Annotation Tracks",
        nameLocation: "center",
        nameRotate: 0,
        nameGap: 40,
        nameTextStyle: {
          fontWeight: "bold",
        },
        axisPointer: {
          show: false,
        },
      },
    ],
    dataZoom: [
      {
        type: "slider",
        xAxisIndex: [0, 1, 3],
        oriten: "horizontal",
        realtime: false,
        selectedDataBackground: {
          lineStyle: {
            width: 0.0,
          },
          areaStyle: {
            opacity: 0.0,
          },
        },
        dataBackground: {
          lineStyle: {
            color: "#464646",
            width: 0.3,
            type: "dashed",
          },
          areaStyle: {
            opacity: 0.0,
          },
        },
        top: "2%",
        bottom: "92.5%",
        left: "10%",
        right: "10%",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        fillerColor: "rgba(96, 113, 150, 0.05)",
        handleColor: "rgba(96, 113, 150, 0.5)",
        handleSize: "50%",
        handleStyle: {},
        moveHandleSize: 1,
        moveHandleStyle: {
          color: "#607196",
        },
        emphasis: {
          handleStyle: {},
          moveHandleStyle: {
            color: "#8197cc",
          },
        },
      },
      {
        type: "slider",
        yAxisIndex: [0, 2],
        oritent: "vertical",
        realtime: false,
        selectedDataBackground: {
          lineStyle: {
            width: 0.0,
          },
          areaStyle: {
            opacity: 0.0,
          },
        },
        dataBackground: {
          lineStyle: {
            color: "#464646",
            width: 0.3,
            type: "dashed",
          },
          areaStyle: {
            opacity: 0.0,
          },
        },
        top: "10%",
        bottom: "10%",
        left: "91.5%",
        right: "5%",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        fillerColor: "rgba(96, 113, 150, 0.05)",
        handleColor: "rgba(96, 113, 150, 0.5)",
        handleSize: "50%",
        handleStyle: {},
        moveHandleSize: 1,
        moveHandleStyle: {
          color: "#607196",
        },
        emphasis: {
          handleStyle: {},
          moveHandleStyle: {
            color: "#8197cc",
          },
        },
      },
    ],
    visualMap: [
      {
        type: "piecewise",
        pieces: [
          // Polar (positive), Basic
          {
            min: 1,
            max: 3,
            color: AMINO_ACID_COLOR["H"],
            label: "Polar, Positive",
          },
          // Polar (negative), Acidic
          {
            min: 4,
            max: 5,
            color: AMINO_ACID_COLOR["D"],
            label: "Polar, Negative",
          },
          // Polar (neutral)
          {
            min: 6,
            max: 9,
            color: AMINO_ACID_COLOR["S"],
            label: "Polar, Neutral",
          },
          // Sulfur bridge forming
          { min: 10, max: 10, color: AMINO_ACID_COLOR["C"], label: "Cysteine" },
          // Aromatic
          { min: 11, max: 13, color: AMINO_ACID_COLOR["F"], label: "Aromatic" },
          // Aliphatic
          {
            min: 14,
            max: 20,
            color: AMINO_ACID_COLOR["A"],
            label: "Aliphatic",
          },
          // Alignment gap
          { min: 23, max: 23, color: AMINO_ACID_COLOR["-"], label: "Gap" },
          // Termination
          {
            min: 22,
            max: 22,
            color: AMINO_ACID_COLOR["*"],
            label: "Termination",
          },
          // Any
          {
            min: 21,
            max: 21,
            color: AMINO_ACID_COLOR["X"],
            label: "Unknown/Any",
          },
        ],
        seriesIndex: [0],
        show: false,
        orient: "vertical",
        align: "left",
        right: "1%",
        top: "center",
      },
      {
        type: "piecewise",
        pieces: [
          {
            gt: 0,
            lte: 1,
            color: "#607196",
            label: "1",
          },
          {
            gt: 1,
            lte: 2,
            color: "#9c73af",
            label: "2",
          },
          {
            gt: 2,
            lte: 4,
            color: "#e56b9d",
            label: ">2",
          },
          {
            gt: 4,
            lte: 8,
            color: "#ff7764",
            label: ">4",
          },
          {
            gt: 8,
            lte: 23,
            color: "#ffa600",
            label: ">8",
          },
        ],
        seriesIndex: 1,
        show: false,
        selectMode: false,
        itemWidth: 4,
        itemHeight: 10,
        textGap: 1,
        itemGap: 4,
        orient: "horizontal",
        top: "4.5%",
        left: "5%",
      },
    ],
    series: [
      {
        type: "heatmap",
        name: "POSITION_CONTENT",
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: [],
        itemStyle: {
          borderColor: "#fafafc",
          borderWidth: 0.1,
        },
        progressive: 0,
        animation: false,
        hoverLayerThreshold: 1000,
      },
      {
        type: "line",
        name: "NO_VARIANTS",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: [],
        smooth: 0.1,
        showSymbol: false,
        animation: false,
      },
      {
        type: "bar",
        name: "SAMPLE_PROPORTION",
        xAxisIndex: 2,
        yAxisIndex: 2,
        data: [],
        showSymbol: false,
        smooth: false,
        step: true,
        itemStyle: {
          opacity: 0.8,
          color: "#607196",
        },
        animation: false,
      },
    ],
  },
  positionViewerEChartOption: {
    legend: {
      type: "scroll",
      right: "right",
      orient: "vertical",
      textStyle: {
        fontSize: 9,
      },
      selectMode: "false",
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "60%"],
        center: ["30%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
        },
        label: {
          show: false,
          position: "center",
        },
        labelLine: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 9,
            color: "#1c1c1c",
          },
        },
        data: [],
      },
    ],
  },
  positionInformation: {},
  metaInformation: {},
  annotationTracks: [],
  noSamples: 0,
  noProteoforms: 0,
};
var SETTINGS = {
  _displayAnnotationTracks: false,
  _truncateAfterFirstTermination: true,
  _excludePFWithInternalTermination: false,
  _PFMinVarPosPerc: 0.0,
  _PFMinNoSamples: 1,
  _explicitPFs: [],
  _explicitSamples: [],
  _proteinViewerAddStyles: {},
};
var wtPrefix = "Wild Type";
var wtGeneLabel = wtPrefix + " Gene (Translated)";
var wtProteoformLabel = wtPrefix + " Proteoform";
var wtProteoformIdentifier = "PF_REFERENCE";

window.onload = (_) => {
  console.log(DATA);

  initializeSequenceViewer();
  observerSequenceViewer = new ResizeObserver((entries) => {
    sequenceViewer.resize({
      width: entries[0].width,
      height: entries[0].height,
    });
  });
  observerSequenceViewer.observe($("#musialweb-protein-dashboard-echart")[0]);
  if (DATA.hasOwnProperty("structure")) {
    initializeProteinViewer();
    inferSecondaryStructureAnnotation();
  } else {
    $("#musialweb-protein-dashboard-3dmol")[0].innerHTML = `
  <h1>
    <small>
      No Protein Structure Available
    <small>
  </h1>
  `;
  }
};

/**
 * Initializes the protein viewer component.
 */
function initializeProteinViewer() {
  _STRUCTURE_VIEW = $3Dmol.createViewer(
    $("#musialweb-protein-dashboard-3dmol"),
    {
      backgroundColor: "#FAFAFC",
      antialias: true,
      cartoonQuality: 6,
    }
  );
  _STRUCTURE_VIEW.addModel(DATA.structure, "pdb");
  _structureViewApplyStyle();
  _STRUCTURE_VIEW.setHoverable(
    {
      // Empty object -> trigger hovering on all atoms.
    },
    true, // Enable hovering.
    (atom, viewer, event, container) => {
      if (!atom.hover_label) {
        atom.hover_label = viewer.addLabel(
          "Pos.: " + atom.resi + " + 0 (" + atom.resn + ")",
          {
            position: atom,
            backgroundColor: "#FAFAFC",
            backgroundOpacity: 0.8,
            fontColor: "black",
            fontSize: 12,
          }
        );
        atom.hover_sphere = viewer.addSphere({
          center: {
            x: atom.x,
            y: atom.y,
            z: atom.z,
          },
          wireframe: true,
          radius: 1.6,
          color: "#fe4848",
          opacity: 1,
        });
        viewer.render();
      }
    },
    (atom) => {
      if (atom.hover_label) {
        _STRUCTURE_VIEW.removeLabel(atom.hover_label);
        _STRUCTURE_VIEW.removeShape(atom.hover_sphere);
        delete atom.hover_label;
        delete atom.hover_sphere;
        _STRUCTURE_VIEW.render();
      }
    }
  );
  _STRUCTURE_VIEW.setHoverDuration(100);
  _STRUCTURE_VIEW.zoomTo();
  _STRUCTURE_VIEW.render();
}

/**
 * Applies cartoon style with color based on No. variants to the protein viewer.
 */
function _structureViewApplyStyle() {
  _STRUCTURE_VIEW.setStyle(
    {
      // Select all residues.
    },
    {
      cartoon: {
        colorfunc: (atom) => {
          let noVariants = STATE.SEQUENCE_VIEW_OPTION.series[1].data.filter(
            (v) => {
              return v[0] === atom.resi + "+0";
            }
          )[0][1];
          let clr = "#E7E7E4";
          if (noVariants == 2) {
            clr = "#9c73af";
          } else if (noVariants > 2 && noVariants <= 4) {
            clr = "#e56b9d";
          } else if (noVariants > 4 && noVariants <= 8) {
            clr = "#ff7764";
          } else if (noVariants > 8) {
            clr = "#ffa600";
          }
          return clr;
        },
        opacity: 0.95,
        thickness: 0.2,
        arrows: true,
      },
    }
  );
  for (const [additionalStylePosition, additionalStyleSpec] of Object.entries(
    SETTINGS._proteinViewerAddStyles
  )) {
    _STRUCTURE_VIEW.addStyle(
      {
        resi: additionalStylePosition,
      },
      additionalStyleSpec
    );
  }
  _STRUCTURE_VIEW.render();
}

/**
 * Extracts information about secondary structure from the 3DMol.js protein model and stores the information as annotation tracks.
 */
function inferSecondaryStructureAnnotation() {
  let secStrucSegments = { c: [], s: [], h: [] };
  let secStrucColors = { c: "#C4A78E", s: "#86B8E1", h: "#E08787" };
  let currentSecStruc = "";
  let segmentStart = "";
  let segmentEnd = "";
  _STRUCTURE_VIEW.getInternalState().models[0].atoms.forEach((atom) => {
    if (atom.resn != "DUM") {
      if (atom.ss !== currentSecStruc) {
        if (currentSecStruc !== "") {
          secStrucSegments[currentSecStruc].push(
            segmentStart + "+0-" + segmentEnd + "+0"
          );
        }
        currentSecStruc = atom.ss;
        segmentStart = atom.resi;
      }
      segmentEnd = atom.resi;
    }
  });
  secStrucSegments[currentSecStruc].push(
    segmentStart + "+0-" + segmentEnd + "+0"
  );
  for (const [t, s] of Object.entries(secStrucSegments)) {
    let label = "";
    let segments = "";
    let color = "";
    if (t == "c") {
      label = "Secondary Structure: Coil";
      segments = s.join(",");
      color = secStrucColors[t];
    } else if (t == "s") {
      label = "Secondary Structure: Sheet";
      segments = s.join(",");
      color = secStrucColors[t];
    } else if (t == "h") {
      label = "Secondary Structure: Helix";
      segments = s.join(",");
      color = secStrucColors[t];
    }
    if (
      !STATE.annotationTracks.some(
        (annotationObject) => annotationObject.label == label
      )
    ) {
      STATE.annotationTracks.push({
        label: label,
        track: "Bottom",
        segments: segments,
        color: color,
        display: "Yes",
      });
      sequenceViewerAddAnnotation(label, segments, "Bottom", color);
    }
  }
  sequenceViewer.setOption(STATE.SEQUENCE_VIEW_OPTION, {
    replaceMerge: ["series"],
  });
  sequenceViewer.resize();
}

/**
 * Highlights a specific residue (determined by the residue index/position) of the currently displayed protein model.
 */
function proteinViewerHighlightPosition(position) {
  _structureViewApplyStyle();
  if (position != undefined && position != null) {
    _STRUCTURE_VIEW.addStyle(
      {
        resi: position.split("+")[0],
      },
      {
        stick: {
          colorfunc: (_) => "#FF5C43",
          radius: 1,
        },
      }
    );
  }
  _STRUCTURE_VIEW.render();
}

/**
 * Initializes the sequence viewer component.
 */
function initializeSequenceViewer() {
  sequenceViewer = echarts.init(
    document.getElementById("musialweb-protein-dashboard-echart"),
    { renderer: "canvas" }
  );
  // Reset any stored information and reset echart option object in STATE.
  STATE.positionInformation = {};
  STATE.META_INFORMATION = {};
  STATE.NO_SAMPLES = 0;
  STATE.NO_FORMS = 0;
  STATE.SEQUENCE_VIEW_OPTION.xAxis[0].data = []; // Index 0 -> Heatmap with per sample, per position variants.
  STATE.SEQUENCE_VIEW_OPTION.yAxis[0].data = [];
  STATE.SEQUENCE_VIEW_OPTION.series[0].data = [];
  STATE.SEQUENCE_VIEW_OPTION.xAxis[1].data = []; // Index 1 -> No. variants track on top.
  STATE.SEQUENCE_VIEW_OPTION.series[1].data = [];
  STATE.SEQUENCE_VIEW_OPTION.yAxis[2].data = []; // Index 2 -> Sample frequency track on the right.
  STATE.SEQUENCE_VIEW_OPTION.series[2].data = [];
  STATE.SEQUENCE_VIEW_OPTION.xAxis[3].data = []; // Index 3 -> Custom tracks.
  STATE.SEQUENCE_VIEW_OPTION.series = STATE.SEQUENCE_VIEW_OPTION.series.splice(
    0,
    3
  ); // Remove all annotation tracks.
  // Initialize temp. variables.
  var position = 1;
  var chainSequence = DATA.translatedNucleotideSequence;
  var hasTerminated = false;
  /**
   * Adds the specified variant information to the STATE.positionInformation object.
   *
   * @param {string} content - The alternate content, i.e., single-letter aminoacid code.
   * @param {string} position - The position at which the variant is present.
   * @param {string} proteoform - The proteoform ID that yields the variant.
   * @param {string} insertionIndex - The number of inserted positions, if any.
   */
  let addPositionVariantInformation = (
    content,
    position,
    proteoform,
    insertionIndex
  ) => {
    let p = position + "+" + insertionIndex;
    if (p in STATE.positionInformation) {
      if (!(proteoform in STATE.positionInformation[p])) {
        STATE.positionInformation[p][proteoform] = content;
      }
    } else {
      STATE.positionInformation[p] = {};
      addPositionVariantInformation(
        content,
        position,
        proteoform,
        insertionIndex
      );
    }
  };
  /**
   * Comparator function that compares to proteoforms stored in DATA.proteoforms by their number of samples.
   *
   * @param {string} proteoformIIdentifier - ID of the first proteoform to compare.
   * @param {string} proteoformJIdentifier - ID of the second proteoform to compare.
   * @returns 1, 0 or -1, dependent on whether pfA or pfB has more samples.
   */
  let sortProteoformsByNoSamples = (
    proteoformIIdentifier,
    proteoformJIdentifier
  ) => {
    let vpa = parseInt(DATA.proteoforms[proteoformIIdentifier].samples.length);
    let vpb = parseInt(DATA.proteoforms[proteoformJIdentifier].samples.length);
    if (vpa > vpb) {
      return 1;
    } else if (vpa == vpb) {
      return 0;
    } else {
      // case of vpa < vpb
      return -1;
    }
  };
  /**
   * Comparator function that compares two positions with the format X+Y where X and Y are substrings that are parsable as strings.
   * X reflects the position on the original protein and Y the number of inserted positions; If X of a and b is equal, Y is used to
   * compare the positions.
   *
   * @param {string} a - The first position to compare.
   * @param {string} b - The second position to compare.
   * @returns 1, 0 or -1, dependent on whether a or b is the subsequent position wrt. the other one.
   */
  let sortPositions = (a, b) => {
    let va = parseInt(a.split("+")[0]);
    let vb = parseInt(b.split("+")[0]);
    if (va == vb) {
      let va = parseInt(a.split("+")[1]);
      let vb = parseInt(b.split("+")[1]);
      if (va > vb) {
        return 1;
      } else if (va < vb) {
        return -1;
      } else {
        return 0;
      }
    } else {
      if (va > vb) {
        return 1;
      } else {
        return -1;
      }
    }
  };

  // Filter proteoforms to display based on the values stored in SETTINGS.
  var filteredProteoformKeys = Object.keys(DATA.proteoforms)
    .sort(sortProteoformsByNoSamples)
    .filter((proteoformKey) => {
      if (
        SETTINGS._excludePFWithInternalTermination &&
        DATA.proteoforms[proteoformKey].annotations.DIV_TERM_POS !== "N/A"
      ) {
        // Filter for absence of premature termination; If filter is set.
        return false;
      } else if (
        DATA.proteoforms[proteoformKey].samples.length <
        SETTINGS._PFMinNoSamples
      ) {
        // Filter for No. samples  below set threshold.
        return false;
      } else if (
        parseFloat(DATA.proteoforms[proteoformKey].annotations.VAR_POS) <
        SETTINGS._PFMinVarPosPerc
      ) {
        // Filter for variable position percentage below set threshold.
        return false;
      } else {
        // Filter if proteoform name or contained sample is explicitly stated to be included.
        let PFIsIncluded =
          SETTINGS._explicitPFs.length == 0 &&
          SETTINGS._explicitSamples.length == 0;
        let PFIncludesSample =
          SETTINGS._explicitPFs.length == 0 &&
          SETTINGS._explicitSamples.length == 0;
        if (!PFIsIncluded) {
          PFIsIncluded = SETTINGS._explicitPFs.includes(proteoformKey);
        }
        if (!PFIncludesSample) {
          PFIncludesSample = SETTINGS._explicitSamples.some((sId) =>
            DATA.proteoforms[proteoformKey].samples.includes(sId)
          );
        }
        return (
          (PFIsIncluded || PFIncludesSample) &&
          proteoformKey !== wtProteoformIdentifier
        );
      }
    });
  STATE.NO_FORMS = filteredProteoformKeys.length + 1;

  // Add information about wild type gene proteoform.
  for (let content of chainSequence.split("")) {
    if (content == content.toUpperCase()) {
      // Content is of gene and protein.
      addPositionVariantInformation(content, position, wtGeneLabel, 0);
      addPositionVariantInformation(content, position, wtProteoformLabel, 0);
    } else {
      // Content is only of gene; e.g. if signal peptides were removed or the provided .pdb model was incomplete.
      addPositionVariantInformation(
        content.toUpperCase(),
        position,
        wtGeneLabel,
        0
      );
    }
    position++;
  }

  // Add information about filtered non wild type proteoforms.
  for (let proteoformKey of filteredProteoformKeys) {
    hasTerminated = false;
    var proteoformVariants =
      DATA.proteoforms[proteoformKey].annotations.VARIANTS.split(";");
    for (let proteoformVariant of proteoformVariants) {
      if (hasTerminated) {
        break;
      }
      var proteoformVariantContent = proteoformVariant.split("!")[1];
      var proteoformVariantPosition = parseInt(
        proteoformVariant.split("!")[0].split("+")[0]
      );
      var proteoformVariantInsertedPosition = parseInt(
        proteoformVariant.split("!")[0].split("+")[1]
      );
      addPositionVariantInformation(
        proteoformVariantContent,
        proteoformVariantPosition,
        proteoformKey,
        proteoformVariantInsertedPosition
      );
      if (proteoformVariantContent === "*") {
        hasTerminated = SETTINGS._truncateAfterFirstTermination;
      }
    }
  }

  // Re-add labels for wild type proteoform.
  filteredProteoformKeys.push(wtGeneLabel);
  filteredProteoformKeys.push(wtProteoformLabel);

  // Set y-axis label data.
  STATE.SEQUENCE_VIEW_OPTION.yAxis[0].data = filteredProteoformKeys;
  STATE.SEQUENCE_VIEW_OPTION.yAxis[0].name =
    "Proteoforms (m = " + STATE.NO_FORMS + ")";
  STATE.SEQUENCE_VIEW_OPTION.yAxis[2].data = filteredProteoformKeys;

  // Sort positions in ascending order and add information to EChart series and x-axis.
  let i = 0;
  for (let position of Object.keys(STATE.positionInformation).sort(
    sortPositions
  )) {
    STATE.SEQUENCE_VIEW_OPTION.xAxis[0].data.push(position);
    STATE.SEQUENCE_VIEW_OPTION.xAxis[1].data.push(position);
    STATE.SEQUENCE_VIEW_OPTION.xAxis[3].data.push(position);
    for (let [proteoform, variant] of Object.entries(
      STATE.positionInformation[position]
    )) {
      STATE.SEQUENCE_VIEW_OPTION.series[0].data.push([
        i,
        filteredProteoformKeys.indexOf(proteoform),
        AMINO_ACID_ENCODING[variant],
      ]);
    }
    STATE.SEQUENCE_VIEW_OPTION.series[1].data.push([
      position,
      Object.keys(computePositionComposition(position)).length - 1,
    ]);
    i++;
  }

  // Compute sample proportion per proteoform.
  let noSamples;
  let totalCounts = [];
  for (let proteoformKey of filteredProteoformKeys) {
    if (proteoformKey === wtGeneLabel) {
      noSamples = DATA.proteoforms.hasOwnProperty(wtProteoformIdentifier)
        ? DATA.proteoforms[wtProteoformIdentifier].samples.length
        : 0;
    } else if (proteoformKey === wtProteoformLabel) {
      noSamples = 0;
    } else {
      noSamples = DATA.proteoforms[proteoformKey].samples.length;
    }
    totalCounts.push(noSamples);
    STATE.NO_SAMPLES += noSamples;
  }
  STATE.SEQUENCE_VIEW_OPTION.series[2].data = totalCounts.map((v) =>
    (v / STATE.NO_SAMPLES).toFixed(4)
  );

  // Add any existing annotation tracks.
  STATE.annotationTracks.forEach((annotationTrackObject) => {
    if (annotationTrackObject.display == "Yes") {
      sequenceViewerAddAnnotation(
        annotationTrackObject.label,
        annotationTrackObject.segments,
        annotationTrackObject.track,
        annotationTrackObject.color
      );
    }
  });

  STATE.SEQUENCE_VIEW_OPTION.tooltip.formatter = (content) => {
    if (content.seriesIndex === 0) {
      showPositionInformation(content);
    }
  };
  sequenceViewer.setOption(STATE.SEQUENCE_VIEW_OPTION, {
    notMerge: true,
  });
  sequenceViewer.resize();
}

/**
 * Toggles display mode of the custom annotations track.
 *
 * @param {boolean} display - Whether to show or hide the custom annotations track.
 */
function sequenceViewerToggleAnnotations(display) {
  if (display) {
    STATE.SEQUENCE_VIEW_OPTION.grid[3].top = "8.5%";
    STATE.SEQUENCE_VIEW_OPTION.grid[3].right = "10%";
    STATE.SEQUENCE_VIEW_OPTION.grid[3].bottom = "81%";
    STATE.SEQUENCE_VIEW_OPTION.grid[3].left = "10%";
    STATE.SEQUENCE_VIEW_OPTION.grid[3].show = true;
    STATE.SEQUENCE_VIEW_OPTION.yAxis[3].show = true;
    STATE.SEQUENCE_VIEW_OPTION.grid[0].top = "20%";
    STATE.SEQUENCE_VIEW_OPTION.grid[2].top = "20%";
    STATE.SEQUENCE_VIEW_OPTION.dataZoom[1].top = "20%";
  } else {
    STATE.SEQUENCE_VIEW_OPTION.grid[3].top = "0%";
    STATE.SEQUENCE_VIEW_OPTION.grid[3].right = "50%";
    STATE.SEQUENCE_VIEW_OPTION.grid[3].bottom = "100%";
    STATE.SEQUENCE_VIEW_OPTION.grid[3].left = "50%";
    STATE.SEQUENCE_VIEW_OPTION.grid[3].show = false;
    STATE.SEQUENCE_VIEW_OPTION.yAxis[3].show = false;
    STATE.SEQUENCE_VIEW_OPTION.grid[0].top = "10%";
    STATE.SEQUENCE_VIEW_OPTION.grid[2].top = "10%";
    STATE.SEQUENCE_VIEW_OPTION.dataZoom[1].top = "10%";
  }
  sequenceViewer.setOption(STATE.SEQUENCE_VIEW_OPTION);
}

/**
 * Adds a heatmap type series to the STATE.sequenceViewerEChartOption object.
 *
 * @param {string} label - The label, i.e., the name, of the annotation.
 * @param {Array} segments - The segments, i.e., two - separated relative positions, at which the annotation shall be displayed.
 * @param {int} track - The track on which the annotation shall be displayed; Has to be 0, 2 and 4 for the bottom, mid and top track, respectively.
 * @param {string} color - HEX format color used for the annotation.
 */
function sequenceViewerAddAnnotation(label, segments, track, color) {
  let positions = [];
  for (let segment of segments.split(",")) {
    let segmentStart = STATE.SEQUENCE_VIEW_OPTION.xAxis[0].data.indexOf(
      segment.split("-")[0]
    );
    let segmentEnd = STATE.SEQUENCE_VIEW_OPTION.xAxis[0].data.indexOf(
      segment.split("-")[1]
    );
    for (let p = segmentStart; p <= segmentEnd; p++) {
      positions.push(parseInt(p));
    }
  }
  var track_index;
  switch (track) {
    case "Bottom":
      track_index = 0;
      break;
    case "Mid":
      track_index = 2;
      break;
    case "Top":
      track_index = 4;
      break;
  }
  STATE.SEQUENCE_VIEW_OPTION.series.push({
    type: "heatmap",
    name: "CUSTOM_TRACK_" + label,
    xAxisIndex: 3,
    yAxisIndex: 3,
    data: positions.map((p) => [p, track_index, 0]),
    itemStyle: {
      color: color,
      borderType: [5, 10],
    },
    animation: false,
    hoverLayerThreshold: 1000,
    progressive: 0,
  });
}

/**
 * Computes a object from STATE.positionInformation that yields the number of occurences of each unique variant at a given position.
 *
 * @param {string} p - The position at which variants shall be counted.
 * @returns Counts per position state.
 */
function computePositionComposition(p) {
  let states = {};
  let content;
  let totalObservations = 0;
  for (let proteoformKey of STATE.SEQUENCE_VIEW_OPTION.yAxis[0].data) {
    if (proteoformKey === wtProteoformLabel) {
      continue;
    } else {
      content =
        proteoformKey in STATE.positionInformation[p]
          ? STATE.positionInformation[p][proteoformKey]
          : STATE.positionInformation[p][wtGeneLabel];
      count = 0;
      if (proteoformKey === wtGeneLabel) {
        proteoformKey = wtProteoformIdentifier;
      }
      if (proteoformKey in DATA.proteoforms) {
        count = DATA.proteoforms[proteoformKey].samples.length;
        if (content in states) {
          states[content] += count;
        } else {
          states[content] = count;
        }
      }
    }
    totalObservations += count;
    STATE.SEQUENCE_VIEW_OPTION.yAxis[2].name =
      "Sample Proportion (n = " + totalObservations + ")";
  }
  delete states.undefined;
  return states;
}

/**
 * Opens the position information dialog with the specified selection object. The selection object has to comprise a name property that represents
 * the selected position in string format X+Y (i.e. residue position + inserted positions) and a data property that represents the data stored in
 * a cell of the variants heatmap, i.e., [ POSITION_INDEX, PROTEOFORM_INDEX, CONTENT_ENCODING ]
 *
 * @param {object} selection - Object describing a selected cell in the variants heatmap.
 */
function showPositionInformation(selection) {
  let position = selection.name;
  let proteoformName =
    STATE.SEQUENCE_VIEW_OPTION.yAxis[0].data[selection.data[1]];
  proteoformName = proteoformName.startsWith(wtPrefix)
    ? wtPrefix
    : proteoformName;
  let mutatedResidue = AMINO_ACID_DECODING[selection.data[2]];
  let wildTypeResidue;
  if (position.split("+")[1] === "0") {
    wildTypeResidue =
      AMINO_ACID_DECODING[
        STATE.SEQUENCE_VIEW_OPTION.series[0].data.filter(
          (e) =>
            e[0] == selection.data[0] &&
            e[1] ==
              STATE.SEQUENCE_VIEW_OPTION.yAxis[0].data.indexOf(wtGeneLabel)
        )[0][2]
      ];
  } else {
    wildTypeResidue = "None";
  }
  let noVariants = STATE.SEQUENCE_VIEW_OPTION.series[1].data.filter(
    (e) => e[0] == position
  )[0][1];
  let positionComposition = computePositionComposition(position);
  $("#musialweb-protein-dashboard-positioninformation-proteoformID").html(
    "<span class='input-info-tag'>Proteoform</span> <b>" +
      proteoformName +
      "</b>"
  );
  let noSamples =
    proteoformName == wtPrefix
      ? DATA.proteoforms.hasOwnProperty(wtProteoformIdentifier)
        ? DATA.proteoforms[wtProteoformIdentifier].samples.length
        : 0
      : DATA.proteoforms[proteoformName].samples.length;
  $("#musialweb-protein-dashboard-positioninformation-noSamples").html(
    "<span class='input-info-tag'>No. Samples</span> <b>" + noSamples + "</b>"
  );
  $("#musialweb-protein-dashboard-positioninformation-position").html(
    "<span class='input-info-tag'>Relative Position</span> <b>" +
      position +
      "</b>"
  );
  $("#musialweb-protein-dashboard-positioninformation-variant").html(
    proteoformName == wtPrefix
      ? "<span class='input-info-tag'>Residue</span> <b>" +
          AMINO_ACID_DESIGNATION[wildTypeResidue] +
          "</b>"
      : "<span class='input-info-tag'>Variant</span> <b>" +
          AMINO_ACID_DESIGNATION[wildTypeResidue] +
          " &#8594; " +
          AMINO_ACID_DESIGNATION[mutatedResidue] +
          "</b>"
  );
  $("#musialweb-protein-dashboard-positioninformation-noVariants").html(
    "<span class='input-info-tag'>No. Variants</span> <b>" + noVariants + "</b>"
  );
  positionViewer = echarts.init(
    document.getElementById(
      "musialweb-protein-dashboard-positioninformation-echart"
    ),
    { renderer: "canvas" }
  );
  STATE.DETAIL_VIEW_OPTION.series[0].data = [];
  for (let [key, value] of Object.entries(positionComposition)) {
    STATE.DETAIL_VIEW_OPTION.series[0].data.push({
      name:
        AMINO_ACID_DESIGNATION[key] +
        ", " +
        value +
        " of " +
        Object.values(positionComposition).reduce((i1, i2) => i1 + i2),
      value: value,
      itemStyle: {
        color: AMINO_ACID_COLOR[key],
        borderWidth: key === mutatedResidue ? 5 : 0,
      },
    });
  }
  positionViewer.setOption(STATE.DETAIL_VIEW_OPTION, true);
  proteinViewerHighlightPosition(position.split("+")[0]);
  displayComponent("musialweb-protein-dashboard-positioninformation", "block");
}

/**
 * Closes the position information dialog an resets its content as well as any selection.
 */
function hidePositionInformation() {
  proteinViewerHighlightPosition();
  hideComponent("musialweb-protein-dashboard-positioninformation");
}

/**
 * Fires the SWAL event to display the proteoform filter tool popup window.
 */
function openDialogFilter() {
  // Extract set `excludePFWithInternalTermination` value from SETTINGS.
  let settingsExcludePTPFschecked = SETTINGS._excludePFWithInternalTermination
    ? "checked"
    : "";
  // Extract set `explicit` value from SETTINGS.
  let settingExplicitValue = "";
  if (SETTINGS._explicitSamples.length > 0) {
    settingExplicitValue += SETTINGS._explicitSamples.join(", ");
  }
  if (SETTINGS._explicitPFs.length > 0) {
    settingExplicitValue += ", " + SETTINGS._explicitPFs.join(", ");
  }
  var samples = [];
  for (let proteoformKey of Object.keys(DATA.proteoforms)) {
    samples.push(...DATA.proteoforms[proteoformKey].samples);
  }
  let htmlContent =
    `
    <div>
        <table class="table">
            <tbody>
                <tr>
                    <th class="w-50 text-left">Filter</th>
                    <th class="w-50 text-left">Value</th>
                </tr>
                <tr>
                    <td class="w-50 text-left">Exlude Proteoforms with Premature Termination</td>
                    <td class="w-50 text-left"><input id="tmp--excludePFWithInternalTermination" type="checkbox" data-cls-check="customCheck bd-gray" data-cls-switch="custom-switch-on-off" data-role="switch" data-material="true"` +
    settingsExcludePTPFschecked +
    `></td>
                </tr>
                <tr>
                    <td class="w-50 text-left">Min. Percentage of Variable Positions</td>
                    <td class="w-50 text-left"><br><input id="tmp--PFMinVarPosPerc" class="input-small" data-min-value="0.0" data-max-value="100.0" data-fixed="1" data-step="0.1" data-role="spinner"></td>
                </tr>
                <tr>
                    <td class="w-50 text-left">Min. No. Samples</td>
                    <td class="w-50 text-left"><br><input id="tmp--PFMinNoSamples" class="input-small" data-min-value="0" data-max-value="` +
    samples.length +
    `" data-fixed="0" data-step="1" data-role="spinner"></td>
                </tr>
                <tr>
                    <td class="w-50 text-left">Include Only</td>
                    <td class="w-50 text-left"><input id="tmp--explicit" type="text" data-role="taginput" data-tag-trigger="Space" value="` +
    settingExplicitValue +
    `"></td>
                </tr>
            </tbody>
        </table>
    </div>
    `;
  Swal.fire({
    title: "Filter Proteoforms",
    width: "70%",
    padding: "0.5em",
    color: "#747474",
    background: "#fafafc",
    html: htmlContent,
    didOpen: () => {
      Metro.getPlugin($("#tmp--PFMinVarPosPerc"), "spinner").val(
        SETTINGS._PFMinVarPosPerc
      );
      Metro.getPlugin($("#tmp--PFMinNoSamples"), "spinner").val(
        SETTINGS._PFMinNoSamples
      );
    },
    backdrop: `
      rgba(96, 113, 150, 0.4)
      left top
      no-repeat
    `,
    confirmButtonColor: "#39c093cc",
  }).then((_) => {
    SETTINGS._excludePFWithInternalTermination = $(
      "#tmp--excludePFWithInternalTermination"
    ).is(":checked");
    SETTINGS._PFMinVarPosPerc = parseFloat(
      document.getElementById("tmp--PFMinVarPosPerc").value
    );
    SETTINGS._PFMinNoSamples = parseInt(
      document.getElementById("tmp--PFMinNoSamples").value
    );
    SETTINGS._explicitPFs = [];
    SETTINGS._explicitSamples = [];
    for (let considered of document
      .getElementById("tmp--explicit")
      .value.split(",")) {
      if (considered.startsWith("PF") && considered in DATA.proteoforms) {
        SETTINGS._explicitPFs.push(considered);
      } else if (considered in samples) {
        SETTINGS._explicitSamples.push(considered);
      }
    }
    initializeSequenceViewer();
    initializeProteinViewer();
  });
}

/**
 * Fires the SWAL event to display the proteoform custom tracks tool popup window.
 */
function openDialogTracks() {
  // Extract set `displayAnnotationTracks` value from SETTINGS.
  let settingsDisplayAnnotationTracks = SETTINGS._displayAnnotationTracks
    ? "checked"
    : "";
  // Definition of the html content to display on the dialog.
  let htmlContent =
    `
    <div class="grid my-1 p-1">
        <div class="row flex-align-center">
            <div class="stub" style="width: 22%">
                <p>Display Annotation Tracks</p>
            </div>
            <div class="stub" style="width: 5%">
                <input id="tmp--displayAnnotationTracks" type="checkbox" data-cls-switch="custom-switch-on-off" data-role="switch" data-material="true"` +
    settingsDisplayAnnotationTracks +
    `>
            </div>
            <div class="stub" style="width: 63%">
            </div>
            <div class="stub" style="width: 10%">
                <button id="tmp--addAnnotationButton" class="button rounded small" style="display: inline-block;">Add Track</button>
            </div>
        </div>
    </div>
    <hr>
    <div id="tmp--trackTable">
    </div>
    `;
  var table;
  Swal.fire({
    title: "Manage Annotation Tracks",
    width: "70%",
    padding: "0.5em",
    color: "#747474",
    background: "#fafafc",
    html: htmlContent,
    didOpen: (_) => {
      document.getElementById("tmp--addAnnotationButton").onclick = (_) => {
        table.addRow(
          {
            label: "",
            track: "Bottom",
            color: "#000000",
            segments: "",
            display: "Yes",
          },
          true
        );
      };
      // Custom editor for segments.
      var segmentEditor = function (cell, onRendered, success, cancel) {
        let editorDiv = document.createElement("div");
        editorDiv.innerHTML =
          `<input id="tmp--segmentList" type="text" data-role="taginput" data-tag-trigger="Space" value="` +
          String(cell.getValue()).replaceAll(",", ", ") +
          `">`;
        editorDiv.style.overflowY = "scroll";
        onRendered(function () {
          editorDiv.focus();
          editorDiv.style.height = "100%";
          editorDiv.style.width = "100%";
        });
        function onChange() {
          let newValue = document
            .getElementById("tmp--segmentList")
            .value.replaceAll(", ", ",");
          console.log(newValue);
          if (newValue != cell.getValue()) {
            success(newValue);
          } else {
            cancel();
          }
        }
        editorDiv.addEventListener("blur", onChange);
        editorDiv.addEventListener("keydown", function (e) {
          if (e.keyCode == 13) {
            onChange();
          }
          if (e.keyCode == 27) {
            cancel();
          }
        });
        return editorDiv;
      };
      // Custom editor for color.
      var colorEditor = function (cell, onRendered, success, cancel) {
        let editorDiv = document.createElement("div");
        editorDiv.innerHTML =
          `<input id="tmp--color" type="color" value="` +
          String(cell.getValue()) +
          `">`;
        onRendered(function () {
          editorDiv.focus();
          document.getElementById("tmp--color").style.height = "5vh";
          document.getElementById("tmp--color").style.width = "100%";
        });
        function onChange() {
          let newValue = document.getElementById("tmp--color").value;
          console.log(newValue);
          if (newValue != cell.getValue()) {
            success(newValue);
          } else {
            cancel();
          }
        }
        editorDiv.addEventListener("blur", onChange);
        editorDiv.addEventListener("keydown", function (e) {
          if (e.keyCode == 13) {
            onChange();
          }
          if (e.keyCode == 27) {
            cancel();
          }
        });
        return editorDiv;
      };
      table = new Tabulator("#tmp--trackTable", {
        columnDefaults: {
          resizable: true,
          editable: true,
        },
        rowContextMenu: [
          {
            label: "Delete Track",
            action: function (e, row) {
              row.delete();
            },
          },
        ],
        columns: [
          { title: "Label", field: "label", editor: "input", width: "20vw" },
          {
            title: "Track",
            field: "track",
            editor: "list",
            editorParams: {
              values: { Bottom: "Bottom", Mid: "Mid", Top: "Top" },
            },
            width: "10vw",
          },
          {
            title: "Color",
            field: "color",
            editor: colorEditor,
            width: "10vw",
          },
          {
            title: "Segments",
            field: "segments",
            editor: segmentEditor,
            width: "50vw",
          },
          {
            title: "Display",
            field: "display",
            editor: "list",
            editorParams: {
              values: { Yes: "Yes", No: "No" },
            },
            width: "10vw",
          },
        ],
        maxHeight: "47vh",
        data: STATE.annotationTracks,
      });
    },
    backdrop: `
      rgba(96, 113, 150, 0.4)
      left top
      no-repeat
    `,
    confirmButtonColor: "#39c093cc",
  }).then((_) => {
    // Remove anntation objects and series.
    STATE.annotationTracks = [];
    STATE.SEQUENCE_VIEW_OPTION.series =
      STATE.SEQUENCE_VIEW_OPTION.series.splice(0, 3);
    for (let annotationObject of table.getData()) {
      STATE.annotationTracks.push({
        label: annotationObject.label,
        track: annotationObject.track,
        segments: annotationObject.segments,
        color: annotationObject.color,
        display: annotationObject.display,
      });
      if (annotationObject.display == "Yes") {
        sequenceViewerAddAnnotation(
          annotationObject.label,
          annotationObject.segments,
          annotationObject.track,
          annotationObject.color
        );
      }
    }
    SETTINGS._displayAnnotationTracks = $("#tmp--displayAnnotationTracks").is(
      ":checked"
    );
    sequenceViewerToggleAnnotations(SETTINGS._displayAnnotationTracks);
    sequenceViewer.setOption(STATE.SEQUENCE_VIEW_OPTION, {
      replaceMerge: ["series"],
    });
    sequenceViewer.resize();
  });
}

/**
 * Fires the SWAL event to display the highlight residues tool popup window.
 */
function openDialogHighlight() {
  let positionsToHighlight = Object.keys(SETTINGS._proteinViewerAddStyles);
  let color = "";
  let style = "";
  // Definition of the html content to display on the dialog.
  let htmlContent =
    `
    <div>
        <table class="table">
            <tbody>
                <tr>
                    <th class="w-50 text-left">Property</th>
                    <th class="w-50 text-left">Value</th>
                </tr>
                <tr>
                    <td class="w-50 text-left">Color</td>
                    <td class="w-50 text-left"><input id="tmp--color" type="color" value=""></td>
                </tr>
                <tr>
                    <td class="w-50 text-left">Style</td>
                    <td class="w-50 text-left">
                    <select id="tmp--style" data-role="select">
                      <option value="line">Line</option>
                      <option value="sphere">Sphere</option>
                      <option value="stick">Stick</option>
                    </select>
                </td>
                </tr>
                <tr>
                    <td class="w-50 text-left">Positions to Highlight</td>
                    <td class="w-50 text-left"><input id="tmp--resi-list" type="text" data-role="taginput" data-tag-trigger="Space" value="` +
    positionsToHighlight +
    `"></td>
                </tr>
            </tbody>
        </table>
    </div>
    `;
  Swal.fire({
    title: "Highlight Structure Positions",
    width: "70%",
    padding: "0.5em",
    color: "#747474",
    background: "#fafafc",
    html: htmlContent,
    backdrop: `
      rgba(96, 113, 150, 0.4)
      left top
      no-repeat
    `,
    confirmButtonColor: "#39c093cc",
  }).then((_) => {
    let positionsToHighlight = document
      .getElementById("tmp--resi-list")
      .value.split(",");
    let color = document.getElementById("tmp--color").value;
    let style = document.getElementById("tmp--style").value;
    SETTINGS._proteinViewerAddStyles = {};
    for (let positionToHighlight of positionsToHighlight) {
      SETTINGS._proteinViewerAddStyles[positionToHighlight] = {};
      SETTINGS._proteinViewerAddStyles[positionToHighlight][style] = {
        color: color,
      };
    }
    _structureViewApplyStyle();
    _STRUCTURE_VIEW.render();
  });
}

/**
 * Hides the specified component.
 *
 * @param {string} - Value of the html id attribute of the component to hide.
 */
function hideComponent(id) {
  document.getElementById(id)
    ? (document.getElementById(id).style.display = "none")
    : null;
}

/**
 * Displays the specified component.
 *
 * @param {string} id - Value of the html id attribute of the component to display.
 * @param {string} s - CSS style value to use for displaying the component. Default is `block`.
 */
function displayComponent(id, s) {
  if (s === null) {
    s = "block";
  }
  document.getElementById(id)
    ? (document.getElementById(id).style.display = s)
    : null;
}
