import math
import numpy as np
from itertools import product
from random import randint
from math import sin, cos


def samples_overview_bar():
    return {
        "title": {
            "top": 0,
            "left": 0,
            "text": "No. Samples by Field",
            "textStyle": {"fontWeight": "lighter"},
        },
        "grid": [
            {"top": "10%", "left": "10%", "height": "80%", "width": "85%"},
        ],
        "xAxis": [
            {
                "type": "category",
                "gridIndex": 0,
                "data": [],
                "name": "Field",
                "nameLocation": "center",
                "nameGap": "25",
            },
        ],
        "yAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "name": "No. Samples",
                "nameLocation": "center",
                "nameGap": "45",
            },
        ],
        "series": [],
    }


def DEP_samples_clustering_map(
    quantization_error, topographic_error, clustered_data, feature_names
):
    series = {}
    sample_names = list(clustered_data.keys())
    global_values = []
    for sample_name, sample_data in clustered_data.items():
        cluster_index = int(sample_data["c"]) - 1
        sample_index = sample_names.index(sample_name)
        if not cluster_index in series:
            series[cluster_index] = {
                "type": "heatmap",
                "data": [],
                "name": "Cluster " + str(cluster_index + 1),
            }
        y = 0
        for value in sample_data["weighted_distances"]:
            series[cluster_index]["data"].append([sample_index, y, value])
            global_values.append(value)
            y += 1
    cutoff_value = float("%.1g" % np.percentile(global_values, 75))
    return {
        "title": [
            {
                "top": 0,
                "left": 0,
                "text": "SOM Clustering Heatmap",
                # "subtext": "Quantization Error: "
                # + str(float("%.3g" % quantization_error))
                # + ", Topographic Error: "
                # + str(float("%.3g" % topographic_error)),
                "textStyle": {"fontWeight": "lighter"},
            },
        ],
        "grid": [
            {"top": "11%", "left": "10%", "height": "80%", "width": "85%"},
        ],
        "xAxis": [
            {
                "type": "category",
                "gridIndex": 0,
                "name": "Samples",
                "nameLocation": "center",
                "nameGap": "25",
                "data": sample_names,
            }
        ],
        "yAxis": [
            {
                "type": "category",
                "gridIndex": 0,
                "name": "Cluster Index",
                "nameLocation": "center",
                "nameGap": "45",
                "data": [str(ci + 1) for ci in range(9)],
                "inverse": True,
                "alignTicks": "value",
            }
        ],
        "legend": {
            "top": "6%",
            "left": "10%",
            "icon": "circle",
            "itemWidth": 10,
            "itemHeight": 10,
            "itemStyle": {"color": "#747474"},
            "textStyle": {"fontSize": 9},
        },
        "visualMap": [
            {
                "type": "continuous",
                "min": 0,
                "max": cutoff_value,
                "color": ["#FFFFFF", "#222222"],
                "top": 0,
                "left": "10%",
                "orient": "horizontal",
                "text": [
                    "≥ " + str(cutoff_value),
                    "Euc. Distance to Cluster SOM Node: " + str(0),
                ],
                "itemWidth": 10,
                "itemHeight": 60,
            }
        ],
        "series": list(series.values()),
    }


def DEP_samples_clustering_scatter(quantization_error, topographic_error, clustered_data, u_matrix, feature_names):
    series = {}
    sample_names = list(clustered_data.keys())
    for sample_name, sample_data in clustered_data.items():
        cluster_index = int(sample_data["c"]) - 1
        sample_index = sample_names.index(sample_name)
        if not cluster_index in series:
            series[cluster_index] = {
                "type": "scatter",
                "data": [],
                "name": "Cluster " + str(cluster_index + 1),
                "symbolSize": 6
            }
        series[cluster_index]["data"].append(sample_data["som_components"])
    return {
        "title": [
            {
                "top": 0,
                "left": 0,
                "text": "Sample SOM Clustering",
                "subtext": "Quantization Error: "
                + str(float("%.3g" % quantization_error))
                + ", Topographic Error: "
                + str(float("%.3g" % topographic_error)),
                "textStyle": {"fontWeight": "lighter"},
            },
        ],
        "grid": [
            {"top": "11%", "left": "10%", "height": "80%", "width": "85%"},
        ],
        "xAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "name": "Distance to BMU",
                "nameLocation": "center",
                "nameGap": "25",
                "alignTicks": "value",
            }
        ],
        "yAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "name": "Distance to second BMU",
                "nameLocation": "center",
                "nameGap": "45",
                "alignTicks": "value",
            }
        ],
        "legend": {
            "top": "11%",
            "right": "5%",
            "icon": "circle",
            "orient": "vertical",
            "itemWidth": 10,
            "itemHeight": 10,
            "textStyle": {"fontSize": 9},
        },
        "series": list(series.values()),
    }


def samples_clustering_map(quantization_error, topographic_error, clustered_data, u_matrix, feature_names):
    unit_series = {}
    for sample_name, sample_data in clustered_data.items( ):
        cluster_index = int(sample_data["c"]) - 1
        unit_x = cluster_index // len( u_matrix )
        unit_y = cluster_index % len( u_matrix[0] )
        if not cluster_index in unit_series:
            unit_series[cluster_index] = {
                "type": "scatter",
                "data": [],
                "name": "Cluster " + str(cluster_index + 1),
                "symbolSize": 2,
                "z": 3,
                "itemStyle": {
                    "color": "#fe4848"
                }
            }
        pos_x = unit_x + ( round( sample_data["normalized_bmu_distance"], 6 ) * cos( randint( 1, 360) ) ) / 2
        pos_y = unit_y + ( round( sample_data["normalized_bmu_distance"], 6 ) * sin( randint( 1, 360) ) ) / 2
        unit_series[cluster_index]["data"].append( [ pos_x, pos_y, sample_name, sample_data["feature_distances"], sample_data[ "unit_distances" ] ] )
    u_matrix_data = [ ]
    cluster_index = 1
    for x, y in product( range( len( u_matrix ) ), range( len( u_matrix[ 0 ] ) ) ) :
        u_matrix_data.append( [ x, y, u_matrix[x][y], cluster_index ] )
        cluster_index += 1
    return {
        "meta": {
            "features": feature_names
        },
        "title": [
            {
                "top": 0,
                "left": 0,
                "text": "Sample SOM Clustering",
                "subtext": "Quantization Error: "
                + str(float("%.3g" % quantization_error))
                + ", Topographic Error: "
                + str(float("%.3g" % topographic_error)),
                "textStyle": {"fontWeight": "lighter"},
            },
        ],
        "grid": [
            {"top": "11%", "left": "10%", "height": "80%", "width": "80%"},
        ],
        "axisPointer": {
            "show": False
        },
        "xAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "name": "Grid Index (X)",
                "nameLocation": "center",
                "nameGap": "25",
                "alignTicks": "value",
                "min": -0.5,
                "max": len( u_matrix ) - 0.5,
                "axisLine": {
                    "show": False
                },
                "axisTick": {
                    "show": False
                },
                "axisLabel": {
                    "showMinLabel": False,
                    "showMaxLabel": False
                },
                "splitLine": {
                    "show": False
                }
            }
        ],
        "yAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "name": "Grid Index (Y)",
                "nameLocation": "center",
                "nameGap": "45",
                "alignTicks": "value",
                "min": -0.5,
                "max": len( u_matrix[0] ) - 0.5,
                "axisLine": {
                    "show": False
                },
                "axisTick": {
                    "show": False
                },
                "axisLabel": {
                    "showMinLabel": False,
                    "showMaxLabel": False
                },
                "splitLine": {
                    "show": False
                }
            }
        ],
        "visualMap": [
            {
                "min": 0.0,
                "max": 1.0,
                "orient": 'horizontal',
                "left": 'center',
                "top": 0,
                "seriesIndex": [ 0 ],
                "color": [ "#607196", "#fafafc" ],
                "precision": 2,
                "text": [ "1", "Normalized Mean Distance to Neighbours 0" ],
                "textStyle": {"fontSize": 9 },
                "dimension": 2
            }
        ],
        "series": [
            {
                "type": "heatmap",
                "name": "U-Matrix",
                "data": u_matrix_data,
                "itemStyle": {
                    "borderWidth": 0.5,
                    "borderColor": "#666666",
                    "borderRadius": 10,
                }
            },
            *list( unit_series.values() )
        ]
    }

def features_overview_parallel(df):
    data_df = df.loc[
        :,
        [
            "number_of_alleles",
            "number_of_proteoforms",
            "number_of_substitutions",
            "number_of_insertions",
            "number_of_deletions",
            "variable_positions",
        ],
    ]
    data_df.fillna(0, inplace=True)
    series = []
    names = list(df["name"].to_numpy())
    name_index = 0
    for entry in data_df.to_numpy():
        series.append(
            {
                "type": "parallel",
                "data": [list(entry)],
                "smooth": 0.1,
                "lineStyle": {
                    "width": 2,
                    "opacity": 0.8,
                },
                "name": names[name_index],
            }
        )
        name_index += 1
    if len(names) > 10:
        colors = ["#747474"]
    else:
        colors = [
            "#C84630",
            "#1B72C3",
            "#4DA167",
            "#392F5A",
            "#DBD053",
            "#F79320",
            "#799CC9",
            "#2E8D8F",
            "#CF2669",
            "#D4CB9F",
        ]
    return {
        "title": {
            "top": 0,
            "left": 0,
            "text": "Features Overview",
            "textStyle": {"fontWeight": "lighter"},
        },
        "parallel": {"right": 200},
        "parallelAxis": [
            {
                "dim": 0,
                "name": "Alleles",
                "max": math.ceil(int(data_df["number_of_alleles"].max()) / 10) * 10,
            },
            {
                "dim": 1,
                "name": "Proteoforms",
                "max": math.ceil(int(data_df["number_of_proteoforms"].max()) / 10) * 10,
            },
            {
                "dim": 2,
                "name": "Substitutions",
                "max": math.ceil(int(data_df["number_of_substitutions"].max()) / 10)
                * 10,
            },
            {
                "dim": 3,
                "name": "Insertions",
                "max": math.ceil(int(data_df["number_of_insertions"].max()) / 10) * 10,
            },
            {
                "dim": 4,
                "name": "Deletions",
                "max": math.ceil(int(data_df["number_of_deletions"].max()) / 10) * 10,
            },
            {
                "dim": 5,
                "name": "Variable Positions (%)",
                "max": max(
                    10, math.ceil(int(data_df["variable_positions"].max()) / 10) * 10
                ),
            },
        ],
        "color": colors,
        "legend": {
            "type": "scroll",
            "orient": "vertical",
            "top": 30,
            "right": 40,
            "align": "right",
            "icon": "circle",
            "backgroundColor": "rgba(228, 229, 237, 0.8)",
            "borderColor": "rgba(228, 229, 237, 0.8)",
            "borderRadius": 2,
            "selector": True,
            "selectorLabel": {
                "fontSize": 9,
            },
        },
        "series": series,
    }


def features_forms_template():
    return {
        "title": {
            "top": 0,
            "left": 0,
            "text": "Feature Forms Graph",
            "textStyle": {"fontWeight": "lighter"},
        },
        "series": [],
    }


def variants_overview_bar(df, max, df_features):
    colors = []
    if len(df_features.index) > 10:
        colors = ["#747474"]
    else:
        colors = [
            "#C84630",
            "#1B72C3",
            "#4DA167",
            "#392F5A",
            "#DBD053",
            "#F79320",
            "#799CC9",
            "#2E8D8F",
            "#CF2669",
            "#D4CB9F",
        ]
    featureVariantsSeries = []
    featureVariantsSeriesNames = []
    positionIndicatorSeries = {
        "rejected": {
            "name": "Rejected Variants",
            "type": "scatter",
            "data": [],
            "symbol": "path://M345,137c9.4-9.4,9.4-24.6,0-33.9s-24.6-9.4-33.9,0l-119,119L73,103c-9.4-9.4-24.6-9.4-33.9,0s-9.4,24.6,0,33.9l119,119L39,375c-9.4,9.4-9.4,24.6,0,33.9s24.6,9.4,33.9,0l119-119L311,409c9.4,9.4,24.6,9.4,33.9,0s9.4-24.6,0-33.9l-119-119L345,137z",
            "symbolSize": 8,
            "itemStyle": {"color": "#747474"},
            "large": True,
            "largeThreshold": 1000,
        },
        "substitution": {
            "name": "Substitutions",
            "type": "scatter",
            "data": [],
            "symbol": "circle",
            "symbolSize": 4,
            "itemStyle": {"color": "#747474"},
            "large": True,
            "largeThreshold": 1000,
        },
        "indel": {
            "name": "InDel Variants",
            "type": "scatter",
            "data": [],
            "symbol": "pin",
            "symbolSize": 8,
            "itemStyle": {"color": "#747474"},
            "large": True,
            "largeThreshold": 1000,
        },
    }
    for feature in df_features["name"].tolist():
        data = [
            [x, y, i, j, t, o]
            for x, y, i, j, t, o in df.loc[df["feature"] == feature]
            .apply(
                lambda row: (
                    row["position"],
                    row["frequency_pass"],
                    row["reference_content"],
                    row["alternate_content"],
                    row["SnpEff.Effect"],
                    row["occurrence"],
                ),
                axis=1,
            )
            .to_list()
        ]
        # Filter for and store rejected sites:
        for rejected in filter(
            lambda d: all([f.split(":")[2] == "true" for f in d[5].split(",")]),
            data,
        ):
            positionIndicatorSeries["rejected"]["data"].append([float(rejected[0]), 0])
        # Filter for and store accepted sites:
        data = list(
            filter(
                lambda d: any([f.split(":")[2] == "false" for f in d[5].split(",")]),
                data,
            )
        )
        for accepted in data:
            if (
                "-" in accepted[2]
                or "-" in accepted[3]
                or len(accepted[2]) > 1
                or len(accepted[3]) > 1
            ):
                positionIndicatorSeries["indel"]["data"].append([float(accepted[0]), 0])
            else:
                positionIndicatorSeries["substitution"]["data"].append(
                    [float(accepted[0]), 0]
                )
        featureVariantsSeriesName = feature + " Variants (" + str(len(data)) + ")"
        featureVariantsSeriesNames.append(featureVariantsSeriesName)
        featureVariantsSeries.append(
            {
                "name": featureVariantsSeriesName,
                "pStart": int(
                    df_features[df_features["name"] == feature]["start"].iloc[0]
                ),
                "pEnd": int(df_features[df_features["name"] == feature]["end"].iloc[0]),
                "type": "bar",
                "data": data,
                "xAxisIndex": 0,
                "yAxisIndex": 0,
                "barGap": "-100%",
                "sampling": "lttb",
            }
        )
    return {
        "title": [
            {
                "top": 0,
                "left": 0,
                "text": "Variants Overview",
                "textStyle": {"fontWeight": "lighter"},
            },
        ],
        "grid": [
            {
                "top": "10%",
                "left": "5%",
                "height": "40%",
                "width": "90%",
            },
        ],
        "legend": [
            {
                "icon": "path://M32,0C49.7,0,64,14.3,64,32V480c0,17.7-14.3,32-32,32s-32-14.3-32-32V32C0,14.3,14.3,0,32,0z",
                "data": [{"name": _} for _ in featureVariantsSeriesNames],
                "top": 0,
                "orient": "horizontal",
                "selectedMode": "single",
            },
            {
                "data": [
                    {
                        "name": "Rejected Variants",
                        "icon": "path://M345,137c9.4-9.4,9.4-24.6,0-33.9s-24.6-9.4-33.9,0l-119,119L73,103c-9.4-9.4-24.6-9.4-33.9,0s-9.4,24.6,0,33.9l119,119L39,375c-9.4,9.4-9.4,24.6,0,33.9s24.6,9.4,33.9,0l119-119L311,409c9.4,9.4,24.6,9.4,33.9,0s9.4-24.6,0-33.9l-119-119L345,137z",
                    },
                    {"name": "Substitutions", "icon": "circle"},
                    {
                        "name": "InDel Variants",
                        "icon": "path://M384,192c0,87.4-117,243-168.3,307.2c-12.3,15.3-35.1,15.3-47.4,0C117,435,0,279.4,0,192C0,86,86,0,192,0S384,86,384,192z",
                    },
                ],
                "textStyle": {"fontSize": 9, "color": "#747474"},
                "backgroundColor": "rgba(228, 229, 237, 0.8)",
                "top": "10%",
                "right": "5%",
                "orient": "vertical",
                "selectedMode": False,
            },
        ],
        "toolbox": {
            "feature": {
                "dataZoom": {
                    "icon": {
                        "zoom": "M208 32a176 176 0 1 1 0 352 176 176 0 1 1 0-352zm0 384c51.7 0 99-18.8 135.3-50L484.7 507.3c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L366 343.3c31.2-36.4 50-83.7 50-135.3C416 93.1 322.9 0 208 0S0 93.1 0 208S93.1 416 208 416zM192 304c0 8.8 7.2 16 16 16s16-7.2 16-16V224h80c8.8 0 16-7.2 16-16s-7.2-16-16-16H224V112c0-8.8-7.2-16-16-16s-16 7.2-16 16v80H112c-8.8 0-16 7.2-16 16s7.2 16 16 16h80v80z",
                        "back": "M16 64c8.8 0 16 7.2 16 16l0 352c0 8.8-7.2 16-16 16s-16-7.2-16-16V80c0-8.8 7.2-16 16-16zm203.3 84.7c6.2 6.2 6.2 16.4 0 22.6L150.6 240l338.7 0-68.7-68.7c-6.2-6.2-6.2-16.4 0-22.6s16.4-6.2 22.6 0l96 96c6.2 6.2 6.2 16.4 0 22.6l-96 96c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6L489.4 272l-338.7 0 68.7 68.7c6.2 6.2 6.2 16.4 0 22.6s-16.4 6.2-22.6 0l-96-96c-6.2-6.2-6.2-16.4 0-22.6l96-96c6.2-6.2 16.4-6.2 22.6 0zM640 80V432c0 8.8-7.2 16-16 16s-16-7.2-16-16V80c0-8.8 7.2-16 16-16s16 7.2 16 16z",
                    },
                    "xAxisIndex": [0],
                    "yAxisIndex": [],
                },
            }
        },
        "xAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "name": "Genome Position",
                "nameLocation": "center",
                "nameGap": 25,
                "min": 1,
                "max": max,
                "minInterval": 1,
                "splitNumber": 10,
            }
        ],
        "yAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "min": 0,
                "max": "dataMax",
                "minInterval": 1,
                "splitNumber": 5,
                "splitLine": {"lineStyle": {"type": "dashed"}},
                "name": "Sample Frequency",
                "nameLocation": "center",
                "nameGap": 50,
            }
        ],
        "color": colors,
        "dataZoom": [
            {
                "type": "slider",
                "xAxisIndex": 0,
                "showDataShadow": False,
                "height": 10,
                "backgroundColor": "transparent",
                "fillerColor": "rgba(109, 129, 173, 0.2)",
                "borderColor": "#9ba6bd",
                "handleStyle": {"borderColor": "#9ba6bd"},
                "moveHandleSize": 5,
                "moveHandleStyle": {
                    "color": "rgba(109, 129, 173, 0.2)",
                    "borderColor": "#9ba6bd",
                },
                "emphasis": {
                    "moveHandleStyle": {
                        "color": "rgba(109, 129, 173, 0.8)",
                    },
                },
                "top": "60%",
            }
        ],
        "series": featureVariantsSeries + list(positionIndicatorSeries.values()),
    }
