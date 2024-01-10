import math, random
from math import sin, cos, log

echarts_toolbox_save_image = {
    "title": "Save Image",
    "icon": "path://M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z",
    "iconStyle": {
        "borderWidth": 0.69
    },
    "pixelRatio": 4
}

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
        "toolbox": {
            "left": 0,
            "bottom": 0,
            "feature": {
                "saveAsImage": echarts_toolbox_save_image
            }
        }
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
        pos_x = unit_x + ( round( sample_data["normalized_bmu_distance"], 6 ) * cos( random.randint( 1, 360) ) ) / 2
        pos_y = unit_y + ( round( sample_data["normalized_bmu_distance"], 6 ) * sin( random.randint( 1, 360) ) ) / 2
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

def samples_clustering_scatter( profiles, projection, clustering ):
    _series = { }
    for profile_name, profile_data in profiles.items( ) :
        if all( [ _.split( "." )[ 1 ] == "reference" for _ in profile_name ] ) :
            profile_data[ "cluster" ] = "reference"
        if not profile_data[ "cluster" ] in _series :
            _series_color = None
            _series_name = None
            _series_symbol = None
            if profile_data[ "cluster" ] == "reference" :
                _series_color = "#fe4848"
                _series_name = "Reference"
                _series_symbol = "diamond"
            elif profile_data[ "cluster" ] == -1 :
                _series_color = "#999999"
                _series_name = "Unassigned"
                _series_symbol = "circle"
            else :
                _series_color = clustering[ "clusters" ][ profile_data[ "cluster" ] ][ "color" ]
                _series_name = "Cluster " + str( profile_data[ "cluster" ] )
                _series_symbol = "circle"
            _series[ profile_data[ "cluster" ] ] = {
                "name": _series_name,
                "type": "scatter",
                "symbol": _series_symbol,
                "data": [ ],
                "label": {
                    "show": False
                },
                "itemStyle": {
                    "color": _series_color
                },
            }
        _series_symbol_size = max( 3, round( log( len( profile_data[ "samples" ] )*3, 2 ) ) )
        _series[ profile_data[ "cluster" ] ][ "data" ].append( {
            "name": profile_name,
            "cluster": profile_data[ "cluster" ],
            "value": [ float(_) for _ in projection[ "embedding" ][ profile_name ] ],
            "symbolSize": 10 if profile_data[ "cluster" ] == "reference" else _series_symbol_size,
            "weight": len( profile_data[ "samples" ] ),
            "assignment_probability": round( profile_data[ "assignment_probability"], 4 ),
        } )
    series = [ ]
    if "reference" in _series :
        series.append( _series.pop( "reference" ) )
    if -1 in _series :
        series.append( _series.pop( -1 ) )
    series += list( dict( sorted( _series.items( ) ) ).values( ) )
    return {
        "title": {
            "top": 0,
            "left": 20,
            "text": "tSNE Embedding",
            "subtext": "Embedding Trustworthiness: " + str( round( projection["trustworthiness"], 3 ) ) + " | Clustering Davies-Bouldin Index: " + str( round( clustering[ "dbi" ], 3 ) ),
            "textStyle": {"fontWeight": "lighter"},
        },
        "grid": [
            {"top": "12%", "left": "10%", "height": "78%", "width": "75%"},
        ],
        "xAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "name": "tSNE 1",
                "nameLocation": "center",
                "nameGap": "25",
            },
        ],
        "yAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "name": "tSNE 2",
                "nameLocation": "center",
                "nameGap": "45",
            },
        ],
        "legend": {
            "type": "scroll",
            "orient": "vertical",
            "top": "10%",
            "right": "1%",
            "bottom": "10%",
            "align": "right",
            "icon": "circle",
            "backgroundColor": "rgba(250, 250, 252, 0.7)",
            "borderRadius": 2,
            "selector": True,
            "selectorLabel": {
                "fontSize": 9,
            },
        },
        "clustering": clustering,
        "series": series,
        "toolbox": {
            "left": 0,
            "bottom": 0,
            "feature": {
                "saveAsImage": echarts_toolbox_save_image,
                "dataZoom": {
                    "icon": {
                        "zoom": "path://M208 16a192 192 0 1 1 0 384 192 192 0 1 1 0-384zm0 400c54.6 0 104.2-21 141.3-55.4l149 149c3.1 3.1 8.2 3.1 11.3 0s3.1-8.2 0-11.3l-149-149C395 312.2 416 262.6 416 208C416 93.1 322.9 0 208 0S0 93.1 0 208S93.1 416 208 416zm-8-112c0 4.4 3.6 8 8 8s8-3.6 8-8V216h88c4.4 0 8-3.6 8-8s-3.6-8-8-8H216V112c0-4.4-3.6-8-8-8s-8 3.6-8 8v88H112c-4.4 0-8 3.6-8 8s3.6 8 8 8h88v88z",
                        "back": "path://M392 128H296c-3.2 0-6.2-1.9-7.4-4.9s-.6-6.4 1.7-8.7l96-96c2.3-2.3 5.7-3 8.7-1.7s4.9 4.2 4.9 7.4v96c0 4.4-3.6 8-8 8zm0 16c13.3 0 24-10.7 24-24V24c0-9.7-5.8-18.5-14.8-22.2S381.9 .2 375 7L337.1 44.9C301.7 16.8 256.8 0 208 0C95.9 0 4.5 88.7 .2 199.7c-.2 4.4 3.3 8.1 7.7 8.3s8.1-3.3 8.3-7.7C20.2 97.8 104.5 16 208 16c44.4 0 85.2 15 117.7 40.3L279 103c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8h96zM24 288h96c3.2 0 6.2 1.9 7.4 4.9s.6 6.4-1.7 8.7l-96 96c-2.3 2.3-5.7 3-8.7 1.7s-4.9-4.2-4.9-7.4V296c0-4.4 3.6-8 8-8zm0-16c-13.3 0-24 10.7-24 24v96c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2l96-96c6.9-6.9 8.9-17.2 5.2-26.2s-12.5-14.8-22.2-14.8H24zm336.6 77.3c32.6-35.2 53.2-81.6 55.2-132.9c.2-4.4-3.3-8.1-7.7-8.3s-8.1 3.3-8.3 7.7C395.8 318.2 311.4 400 208 400c-44.4 0-85.2-15-117.7-40.3L78.9 371.1C114.3 399.2 159.2 416 208 416c54.6 0 104.2-21 141.3-55.4l149 149c3.1 3.1 8.2 3.1 11.3 0s3.1-8.2 0-11.3l-149-149z"
                    },
                    "iconStyle": {
                        "borderWidth": 0.69
                    },
                },
            }
        }
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
        "parallel": {"top": "15%", "left": "5%", "height": "80%", "width": "75%"},
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
            "backgroundColor": "rgba(250, 250, 252, 0.7)",
            "borderRadius": 2,
            "selector": True,
            "selectorLabel": {
                "fontSize": 9,
            },
        },
        "series": series,
        "toolbox": {
            "left": 0,
            "bottom": 0,
            "feature": {
                "saveAsImage": echarts_toolbox_save_image
            }
        }
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
        "toolbox": {
            "left": 0,
            "bottom": 0,
            "feature": {
                "saveAsImage": echarts_toolbox_save_image
            }
        }
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
                "width": "87%",
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
                "textStyle": {"fontSize": 10, "color": "#747474"},
                "backgroundColor": "rgba(250, 250, 252, 0.7)",
                "top": "10%",
                "right": "0%",
                "orient": "vertical",
                "selectedMode": False,
            },
        ],
        "toolbox": {
            "feature": {
                "saveAsImage": echarts_toolbox_save_image,
                "dataZoom": {
                    "icon": {
                        "zoom": "path://M208 16a192 192 0 1 1 0 384 192 192 0 1 1 0-384zm0 400c54.6 0 104.2-21 141.3-55.4l149 149c3.1 3.1 8.2 3.1 11.3 0s3.1-8.2 0-11.3l-149-149C395 312.2 416 262.6 416 208C416 93.1 322.9 0 208 0S0 93.1 0 208S93.1 416 208 416zm-8-112c0 4.4 3.6 8 8 8s8-3.6 8-8V216h88c4.4 0 8-3.6 8-8s-3.6-8-8-8H216V112c0-4.4-3.6-8-8-8s-8 3.6-8 8v88H112c-4.4 0-8 3.6-8 8s3.6 8 8 8h88v88z",
                        "back": "path://M392 128H296c-3.2 0-6.2-1.9-7.4-4.9s-.6-6.4 1.7-8.7l96-96c2.3-2.3 5.7-3 8.7-1.7s4.9 4.2 4.9 7.4v96c0 4.4-3.6 8-8 8zm0 16c13.3 0 24-10.7 24-24V24c0-9.7-5.8-18.5-14.8-22.2S381.9 .2 375 7L337.1 44.9C301.7 16.8 256.8 0 208 0C95.9 0 4.5 88.7 .2 199.7c-.2 4.4 3.3 8.1 7.7 8.3s8.1-3.3 8.3-7.7C20.2 97.8 104.5 16 208 16c44.4 0 85.2 15 117.7 40.3L279 103c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8h96zM24 288h96c3.2 0 6.2 1.9 7.4 4.9s.6 6.4-1.7 8.7l-96 96c-2.3 2.3-5.7 3-8.7 1.7s-4.9-4.2-4.9-7.4V296c0-4.4 3.6-8 8-8zm0-16c-13.3 0-24 10.7-24 24v96c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2l96-96c6.9-6.9 8.9-17.2 5.2-26.2s-12.5-14.8-22.2-14.8H24zm336.6 77.3c32.6-35.2 53.2-81.6 55.2-132.9c.2-4.4-3.3-8.1-7.7-8.3s-8.1 3.3-8.3 7.7C395.8 318.2 311.4 400 208 400c-44.4 0-85.2-15-117.7-40.3L78.9 371.1C114.3 399.2 159.2 416 208 416c54.6 0 104.2-21 141.3-55.4l149 149c3.1 3.1 8.2 3.1 11.3 0s3.1-8.2 0-11.3l-149-149z"
                    },
                    "iconStyle": {
                        "borderWidth": 0.69
                    },
                    "xAxisIndex": [0],
                    "yAxisIndex": [],
                },
            },
            "left": 0,
            "bottom": 0,
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
