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
  X: 21, // Any
  "*": 22, // Ter.
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
  M: "#000000", // "#88bcc3", // MET
  P: "#99c6cc", // PRO
  G: "#aacfd4", // GLY
  // Other
  X: "#a89471", // ANY
  "*": "#FF0099", // TER
  "-": "#3c3c3c", // Gap
};
var STATE = {
  SEQUENCE_VIEW_OPTION: {
    title: [],
    grid: [
      {
        id: "GRID_VARIANTS_HEATMAP",
        top: "14%",
        bottom: "10%",
        left: "10%",
        right: "10%",
      },
      {
        id: "GRID_POSITION_VARIABILITY",
        top: "5%",
        bottom: "88.5%",
        left: "10%",
        right: "10%",
      },
      {
        id: "GRID_PROTEOFORM_PROPORTION",
        top: "14%",
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
        formatter: (o) => {
          let V;
          if (o.axisDimension == "x" && o.axisIndex == 0) {
            if (o.value.split("+")[1] == "0") {
              V = o.value.split("+")[0];
            } else {
              V = o.value;
            }
            return "Position " + V;
          } else if (o.axisDimension == "x" && o.axisIndex == 1) {
            if (_SETTINGS.TOGGLE_DISORDERED_PROTEOFORMS) {
              V =
                Object.keys(STATE.POSITION_DATA[o.value]).filter(
                  (l) =>
                    !DATA.proteoforms[l].annotations.hasOwnProperty(
                      "novel_stops"
                    )
                ).length - 1;
            } else {
              V = Object.keys(STATE.POSITION_DATA[o.value]).length - 1;
            }
            return V + " Variants";
          } else if (o.axisDimension == "y" && o.axisIndex == 0) {
            return (
              "Proteoform " +
              o.value +
              " (" +
              DATA.proteoforms[o.value].annotations.samples +
              ") Samples"
            );
          } else {
            return;
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
          show: false,
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
        axisLabel: {
          formatter: (o) => {
            if (o.split("+")[1] == "0") {
              return o.split("+")[0];
            } else {
              return o;
            }
          },
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
        type: "value",
        gridIndex: 2,
        minInterval: 1,
        show: true,
        data: [],
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
        min: 0.0,
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
        name: "Sample Count",
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
        top: "5%",
        bottom: "88.5%",
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
        top: "14%",
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
            color: "#3E92CC",
            label: "Polar, Positive",
          },
          // Polar (negative), Acidic
          {
            min: 4,
            max: 5,
            color: "#D93243",
            label: "Polar, Negative",
          },
          // Polar (neutral)
          {
            min: 6,
            max: 9,
            color: "#3DCC57",
            label: "Polar, Neutral",
          },
          // Sulfur bridge forming
          { min: 10, max: 10, color: "#FFC145", label: "Cysteine" },
          // Aromatic
          { min: 11, max: 13, color: "#7D45FF", label: "Aromatic" },
          // Aliphatic
          {
            min: 14,
            max: 20,
            color: "#94AAAC",
            label: "Aliphatic",
          },
          // Alignment gap
          { min: 23, max: 23, color: "#313232", label: "Gap" },
          // Termination
          {
            min: 22,
            max: 22,
            color: "#EE39B7",
            label: "Termination",
          },
          // Any
          {
            min: 21,
            max: 21,
            color: "#72635C",
            label: "Unknown/Any",
          },
        ],
        seriesIndex: [0],
        show: true,
        selectedMode: false,
        orient: "horizontal",
        align: "right",
        right: "center",
        top: "top",
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
        name: "SAMPLE_COUNT",
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
  DETAIL_VIEW_OPTION: {
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
  POSITION_DATA: {},
  META_INFORMATION: {},
  annotationTracks: [],
  NO_SAMPLES: 0,
  NO_FORMS: 0,
};
var _SETTINGS = {
  STRUCTURE_VIEW_STYLE_STICK: {
    color: "#747474",
    radius: 0.02,
  },
  STRUCTURE_VIEW_STYLE_CARTOON: {
    colorfunc: (atom) => {
      return _structureViewColorByEntropy(atom, 0.2);
    },
    opacity: 0.95,
    thickness: 0.2,
    arrows: true,
  },
  TOGGLE_DISORDERED_PROTEOFORMS: false,
};
var _STRUCTURE_VIEW; // 3DMol.js instance.
var _SEQUENCE_VIEW; // ECharts.js instance.

window.onload = (_) => {
  Object.keys(DATA.alleles).forEach((allele) => {
    STATE.NO_SAMPLES += DATA.alleles[allele]["occurrence"].length;
  });
  STATE.NO_FORMS = Object.keys(DATA.proteoforms).length;
  _initializeStructureView();
  _collectVariantsInformation();
  console.log(DATA);
  _initializeSequenceView();
};

function _initializeStructureView() {
  if (DATA.hasOwnProperty("structure")) {
    _STRUCTURE_VIEW = $3Dmol.createViewer($("#structure-view-container"), {
      backgroundColor: "#FAFAFC",
      antialias: true,
      cartoonQuality: 6,
    });
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
            "Position " +
              atom.resi +
              " " +
              atom.resn +
              " | No. Variants " +
              _getVariantsCount(atom.resi) +
              " | Entropy " +
              _getVariantsEntropy(atom.resi),
            {
              position: atom,
              backgroundColor: "#FAFAFC",
              backgroundOpacity: 0.8,
              fontColor: "black",
              fontSize: 12,
            }
          );
          viewer.addStyle(
            { resi: atom.resi },
            {
              stick: {
                color: "#747474",
                radius: 0.3,
              },
            }
          );
          viewer.render();
        }
      },
      (atom, viewer, event, container) => {
        if (atom.hover_label) {
          _STRUCTURE_VIEW.removeLabel(atom.hover_label);
          viewer.addStyle(
            { resi: atom.resi },
            {
              stick: {
                color: "#747474",
                radius: 0.02,
              },
            }
          );
          delete atom.hover_label;
          _STRUCTURE_VIEW.render();
        }
      }
    );
    _STRUCTURE_VIEW.setHoverDuration(100);
    _STRUCTURE_VIEW.zoomTo();
    _STRUCTURE_VIEW.render();
  } else {
    $("#structure-view-container")[0].innerHTML = `
  <h1>
    <small>
      No Protein Structure Available
    <small>
  </h1>
  `;
  }
}

function _structureViewApplyStyle() {
  _STRUCTURE_VIEW.setStyle(
    {
      // Select all residues.
    },
    {
      cartoon: _SETTINGS.STRUCTURE_VIEW_STYLE_CARTOON,
      stick: _SETTINGS.STRUCTURE_VIEW_STYLE_STICK,
    }
  );
  _STRUCTURE_VIEW.render();
}

function _collectVariantsInformation() {
  var position = 1;
  let addPositionData = (content, position, proteoform, insertionIndex) => {
    let p = position + "+" + insertionIndex;
    if (p in STATE.POSITION_DATA) {
      if (!(proteoform in STATE.POSITION_DATA[p])) {
        STATE.POSITION_DATA[p][proteoform] = content;
      }
    } else {
      STATE.POSITION_DATA[p] = {};
      addPositionData(content, position, proteoform, insertionIndex);
    }
  };

  // Collect position information of reference sequence.
  for (let content of DATA.codingSequence.split("")) {
    addPositionData(content, position, "reference", 0);
    position++;
  }

  // Collect position information of proteoforms.
  for (let variantPosition of Object.keys(DATA.aminoacidVariants)) {
    for (let variantContent of Object.keys(
      DATA.aminoacidVariants[variantPosition]
    )) {
      let position = parseInt(variantPosition);
      let insertionIndex = 0;
      let variantContents = variantContent.split("");
      let inDel = false;
      if (variantContent.length > 1) {
        variantContents = variantContent.slice(1);
        inDel = true;
      }
      let variantProperties =
        DATA.aminoacidVariants[variantPosition][variantContent].properties;
      for (let c of variantContents) {
        if (c == "-") {
          position++;
        } else if (inDel) {
          insertionIndex++;
        }
        for (let sample of Object.keys(variantProperties)
          .filter((p) => p.startsWith("of_sample_"))
          .map((s) => s.replace("of_sample_", ""))) {
          addPositionData(
            c,
            position,
            DATA.samples[sample].annotations["proteoform_" + DATA.name],
            insertionIndex
          );
        }
      }
    }
  }

  // Supplement proteoform meta-information.
  for (let proteoform of Object.keys(DATA.proteoforms)) {
    DATA.proteoforms[proteoform].annotations["samples"] = 0;
    for (let allele of DATA.proteoforms[proteoform]["occurrence"]) {
      DATA.proteoforms[proteoform].annotations["samples"] +=
        DATA.alleles[allele]["occurrence"].length;
    }
  }
}

function _initializeSequenceView() {
  let proteoformLabels = Object.keys(DATA.proteoforms);
  if (_SETTINGS.TOGGLE_DISORDERED_PROTEOFORMS) {
    proteoformLabels = proteoformLabels.filter(
      (l) => !DATA.proteoforms[l].annotations.hasOwnProperty("novel_stops")
    );
  }
  proteoformLabels.sort(_sequenceViewSortProteoforms);

  // Inizialize Y-axis label data.
  STATE.SEQUENCE_VIEW_OPTION.yAxis[0].data = proteoformLabels;
  STATE.SEQUENCE_VIEW_OPTION.yAxis[0].name =
    "Proteoforms (" + proteoformLabels.length + ")";
  STATE.SEQUENCE_VIEW_OPTION.yAxis[2].data = proteoformLabels;

  // Initialize X-axis label and `variants heatmap` series data.
  for (let position of Object.keys(STATE.POSITION_DATA).sort(
    _sequenceViewSortPositions
  )) {
    STATE.SEQUENCE_VIEW_OPTION.xAxis[0].data.push(position);
    STATE.SEQUENCE_VIEW_OPTION.xAxis[1].data.push(position);
    STATE.SEQUENCE_VIEW_OPTION.xAxis[2].minInterval = STATE.NO_SAMPLES;
    for (let [proteoform, variant] of Object.entries(
      STATE.POSITION_DATA[position]
    )) {
      STATE.SEQUENCE_VIEW_OPTION.series[0].data.push([
        position,
        proteoformLabels.indexOf(proteoform),
        AMINO_ACID_ENCODING[variant],
      ]);
    }
    let variantsCount;
    if (_SETTINGS.TOGGLE_DISORDERED_PROTEOFORMS) {
      variantsCount =
        Object.keys(STATE.POSITION_DATA[position]).filter(
          (l) => !DATA.proteoforms[l].annotations.hasOwnProperty("novel_stops")
        ).length - 1;
    } else {
      variantsCount = Object.keys(STATE.POSITION_DATA[position]).length - 1;
    }
    STATE.SEQUENCE_VIEW_OPTION.series[1].data.push([position, variantsCount]);
  }

  // Initialize `sample count` series data.
  let counts = [];
  for (let proteoform of proteoformLabels) {
    counts.push(DATA.proteoforms[proteoform].annotations.samples);
  }
  STATE.SEQUENCE_VIEW_OPTION.series[2].data = counts;

  _SEQUENCE_VIEW = echarts.init(
    document.getElementById("sequence-view-container"),
    {
      renderer: "canvas",
    }
  );
  _SEQUENCE_VIEW.setOption(STATE.SEQUENCE_VIEW_OPTION, {
    notMerge: true,
  });
  new ResizeObserver((entries) => {
    _SEQUENCE_VIEW.resize({
      width: entries[0].width,
      height: entries[0].height,
    });
  }).observe($("#sequence-view-container")[0]);
  _SEQUENCE_VIEW.resize();
}

function _getVariantsCount(pos) {
  if (DATA.aminoacidVariants.hasOwnProperty(pos)) {
    return Object.keys(DATA.aminoacidVariants[pos]).length;
  } else {
    return 0;
  }
}

function _getVariantsEntropy(pos) {
  S = 0;
  if (DATA.aminoacidVariants.hasOwnProperty(pos)) {
    for (const aa of Object.keys(AMINO_ACID_ENCODING)) {
      if (DATA.aminoacidVariants[pos].hasOwnProperty(aa)) {
        let occurrence = Object.keys(
          DATA.aminoacidVariants[pos][aa]["properties"]
        ).filter((property) =>
          String(property).startsWith("of_sample_")
        ).length;
        p = occurrence / STATE.NO_SAMPLES;
        S += -1 * (p * Math.log2(p));
      }
    }
  }
  return S.toFixed(4);
}

function _structureViewColorByEntropy(atom, t) {
  // 0 | 223, 241, 255
  // 1 | 254, 72, 72
  let rgb = [223, 241, 255];
  let entropy = _getVariantsEntropy(atom.resi);
  let d = Math.min(...[entropy / t, 1]);
  rgb[0] = rgb[0] + (254 - 223) * d;
  rgb[1] = rgb[1] - (241 - 72) * d;
  rgb[2] = rgb[2] - (255 - 72) * d;
  return "rgb(" + rgb.join(",") + ")";
}

let _sequenceViewSortProteoforms = (pfId1, pfId2) => {
  let pfId1Samples = DATA.proteoforms[pfId1].annotations.samples;
  let pfId2Samples = DATA.proteoforms[pfId2].annotations.samples;
  if (pfId1Samples > pfId2Samples) {
    return 1;
  } else if (pfId1Samples == pfId2Samples) {
    return 0;
  } else {
    return -1;
  }
};

let _sequenceViewSortPositions = (a, b) => {
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
