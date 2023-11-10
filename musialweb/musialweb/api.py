from musialweb import app
from flask import request, session, send_file, render_template
from flask_session import Session
from datetime import timedelta, datetime
from itertools import combinations, product
from operator import methodcaller
from dotenv import load_dotenv
from io import StringIO
from Bio import SeqIO
import json, zlib, os, subprocess, shutil, brotli, random, string, re, brotli, base64, copy, traceback, math
import pandas as pd
import numpy as np
import scipy as sc
import musialweb.chart as mwchart
import musialweb.clustering as mwclustering

PATH_PREFIX = "./"

""" Load variables from local file system. """
load_dotenv()

""" Set session configuration parameters. """
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_KEY_PREFIX"] = "musial:"
app.config["SESSION_COOKIE_NAME"] = "musial:session"
app.config["SESSION_FILE_DIR"] = PATH_PREFIX + "session/"
app.config["SESSION_USE_SIGNER"] = True
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=5.0)
app.config["SESSION_FILE_THRESHOLD"] = 15000
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024  # Limit content lengths to 1 GB.
""" Set constant session keys. """
SESSION_KEY_REFERENCE_SEQUENCE = "UkVGRVJFTkNFX1NFUVVFTkNF"
SESSION_KEY_STATUS = "U1RBVFVT"
SESSION_KEY_SAMPLES_DF = "U0FNUExFU19ERg"
SESSION_KEY_SAMPLES_CLUSTERING = "U0FNUExFU19DTFVTVEVSSU5H"
SESSION_KEY_FEATURES_DF = "RkVBVFVSRVNfREY"
SESSION_KEY_VARIANTS_DF = "VkFSSUFOVFNfREY"
""" Set API parameters. """
API_CODES = {
    "SUCCESS_CODE": "0",  # Response return code for successful requests.
    "FAILURE_CODE": "1",  # Response return code for failed requests (due to server internal error).
    "SESSION_CODE_NONE": "2",  # Response code indicating no active session.
    "SESSION_CODE_ACTIVE": "0",  # Response code  indicating an active session.
    "SESSION_CODE_FAILED": "1",  # Response code  indicating a failed session.
    "RESULT_KEY": os.getenv("RESULT_KEY"),
    "URL": os.getenv("URL"),
}
""" Set DEBUG to true in order to display log as console output. """
DEBUG = bool(int(os.getenv("DEBUG")))
""" Start session """
Session(app)


@app.route("/session/status", methods=["GET"])
def session_status():
    """
    GET route to check whether an active session exists.
    """
    if not SESSION_KEY_STATUS in session:
        return {"code": API_CODES["SESSION_CODE_NONE"]}
    else:
        return {"code": session[SESSION_KEY_STATUS]}


@app.route("/session/start", methods=["POST"])
def session_start():
    """
    POST route to process user submission.

    The data content of the request has to comply with the MUSIAL run specification (TODO URL), but
    instead of each file path specification the file content is stored. The request's data content is
    expected to be zlib compressed, base64 encoded. The specified file contents will be written to
    the local (server side) file system together with the adjustes MUSIAL run specification.
    MUSIAL is run on the provided data and the generated (TODO variants dicionary) is stored in a opened
    user session, if successfull.
    """
    # Clear any current session data.
    session.clear()
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()
    # Variables to store output of MUSIAL run.
    stdout = ""
    stderr = ""
    result = ""
    response_code = API_CODES["SUCCESS_CODE"]
    try:
        # Generate directory to store data temporary in the local file system.
        os.makedirs(PATH_PREFIX + "tmp/" + unique_hex_key)
        # Inflate the request data and transform into python dictionary.
        inflated_request_data = zlib.decompress(request.data)
        json_string_request_data = inflated_request_data.decode("utf8")
        json_request_data = json.loads(json_string_request_data)
        # Write reference .fasta to local file and set path in run specification.
        with open(
            PATH_PREFIX + "tmp/" + unique_hex_key + "/reference.fasta", "w+"
        ) as reference_fasta_file:
            reference_fasta_file.write(json_request_data["referenceSequenceFile"])
            json_request_data["referenceSequenceFile"] = (
                PATH_PREFIX + "tmp/" + unique_hex_key + "/reference.fasta"
            )
        # Write reference .gff3 to local file and set path in run specification.
        with open(
            PATH_PREFIX + "tmp/" + unique_hex_key + "/reference.gff3", "w+"
        ) as reference_gff3_file:
            reference_gff3_file.write(json_request_data["referenceFeaturesFile"])
            json_request_data["referenceFeaturesFile"] = (
                PATH_PREFIX + "tmp/" + unique_hex_key + "/reference.gff3"
            )
        # For each specified feature, write .pdb to local file and set path in run specification, if provided.
        for feature in json_request_data["features"].keys():
            if "pdbFile" in json_request_data["features"][feature]:
                with open(
                    PATH_PREFIX + "tmp/" + unique_hex_key + "/" + feature + ".pdb", "w+"
                ) as feature_pdb_file:
                    feature_pdb_file.write(
                        json_request_data["features"][feature]["pdbFile"]
                    )
                    json_request_data["features"][feature]["pdbFile"] = (
                        PATH_PREFIX + "tmp/" + unique_hex_key + "/" + feature + ".pdb"
                    )
        # For each specified sample, write .vcf to local file and set path in run specification.
        for sample in json_request_data["samples"].keys():
            with open(
                PATH_PREFIX + "tmp/" + unique_hex_key + "/" + sample + ".vcf", "w+"
            ) as sample_vcf_file:
                sample_vcf_file.write(json_request_data["samples"][sample]["vcfFile"])
                json_request_data["samples"][sample]["vcfFile"] = (
                    PATH_PREFIX + "tmp/" + unique_hex_key + "/" + sample + ".vcf"
                )
        # Write the adjusted request (i.e. used as MUSIAL build configuration) to local file.
        with open(
            PATH_PREFIX + "tmp/" + unique_hex_key + "/configuration.json", "w+"
        ) as build_configuration_file:
            json_request_data["output"] = (
                PATH_PREFIX + "tmp/" + unique_hex_key + "/output.json"
            )
            json.dump(json_request_data, build_configuration_file)
        # Run MUSIAL on the specified data.
        process = subprocess.Popen(
            [
                os.getenv("JAVA_PATH"),
                "-Xms4G",
                "-Xmx8G",
                "-jar",
                PATH_PREFIX + "MUSIAL-v2.2.jar",
                "build",
                "-c",
                PATH_PREFIX + "tmp/" + unique_hex_key + "/configuration.json",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = process.communicate()
        stdout = stdout.decode(encoding="utf-8")
        stderr = stderr.decode(encoding="utf-8")
        # If any error was raised during MUSIAL, set response code to 1 (failed).
        # Here, WARN and INFO entries from BioJava have to be filtered!
        biojava_info_tag = "INFO  org.biojava.nbio"
        biojava_warn_tag = "WARN  org.biojava.nbio"
        if (
            len(
                list(
                    filter(
                        lambda e: (biojava_info_tag not in e)
                        and (biojava_warn_tag not in e),
                        list(filter(methodcaller("strip"), stderr.split("\n"))),
                    )
                )
            )
            > 0
        ):
            response_code = API_CODES["FAILURE_CODE"]
            session[SESSION_KEY_STATUS] = API_CODES["SESSION_CODE_FAILED"]
            _log(request.url, _remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
            if DEBUG:
                print("\033[41m ERROR \033[0m")
                print(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        # Else, parse and store output of MUSIAL.
        else:
            with open(
                PATH_PREFIX + "tmp/" + unique_hex_key + "/output.json", "r"
            ) as run_out_file:
                session[API_CODES["RESULT_KEY"]] = json.load(run_out_file)
            session[SESSION_KEY_STATUS] = API_CODES["SESSION_CODE_ACTIVE"]
    # If any error is thrown by the server, set response code to 1 (failed).
    except Exception as e:
        response_code = API_CODES["FAILURE_CODE"]
        session[SESSION_KEY_STATUS] = API_CODES["SESSION_CODE_FAILED"]
        _log(request.url, _remove_ansi(str(e)))
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(_remove_ansi(str(e)))
            traceback.print_exc()
    finally:
        # Remove temporary files, store results and log in session and return response code.
        shutil.rmtree(PATH_PREFIX + "tmp/" + unique_hex_key)
        _log(request.url, _remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        if DEBUG:
            print("\033[46m LOG \033[0m")
            print(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        return {"code": response_code}


@app.route("/session/data", methods=["GET"])
def session_data():
    """TODO"""
    if not API_CODES["RESULT_KEY"] in session:
        return {
            "code": API_CODES["FAILURE_CODE"],
        }
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()
    # Variables to store output of MUSIAL run.
    stdout = ""
    stderr = ""
    response = []
    response_code = API_CODES["SUCCESS_CODE"]
    try:
        # If any view results are not stored, generate directory to store MUSIAL run result temp. in the local file system.
        if (
            not SESSION_KEY_SAMPLES_DF in session
            or not SESSION_KEY_FEATURES_DF in session
            or not SESSION_KEY_VARIANTS_DF in session
            or not SESSION_KEY_SAMPLES_CLUSTERING in session
        ):
            os.makedirs(PATH_PREFIX + "tmp/" + unique_hex_key)
            with open(
                PATH_PREFIX + "tmp/" + unique_hex_key + "/results.json", "w+"
            ) as session_results:
                session_results.write(json.dumps(session[API_CODES["RESULT_KEY"]]))

        # (i) Run MUSIAL on the specified data to view samples.
        if not SESSION_KEY_SAMPLES_CLUSTERING in session:
            session[SESSION_KEY_SAMPLES_CLUSTERING] = {
                "allele": _run_sample_clustering("allele"),
                "proteoform": _run_sample_clustering("proteoform"),
            }
        if not SESSION_KEY_SAMPLES_DF in session:
            process = subprocess.Popen(
                [
                    os.getenv("JAVA_PATH"),
                    "-jar",
                    PATH_PREFIX + "MUSIAL-v2.2.jar",
                    "view_samples",
                    "-I",
                    PATH_PREFIX + "tmp/" + unique_hex_key + "/results.json",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            stdout, stderr = process.communicate()
            stdout = stdout.decode()
            stderr = stderr.decode()
            sample_df, sample_records = _view_samples_output_to_dict(stdout)
            session[SESSION_KEY_SAMPLES_DF] = sample_df
            if stderr != "":
                _log(
                    request.url,
                    "Error when retrieving sample data; " + _remove_ansi(stderr),
                )
        else:
            _, sample_records = _view_samples_output_to_dict(None)
        response.append(sample_records)

        # (ii) Run MUSIAL on the specified data to view features.
        if not SESSION_KEY_FEATURES_DF in session:
            process = subprocess.Popen(
                [
                    os.getenv("JAVA_PATH"),
                    "-jar",
                    PATH_PREFIX + "MUSIAL-v2.2.jar",
                    "view_features",
                    "-I",
                    PATH_PREFIX + "tmp/" + unique_hex_key + "/results.json",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            stdout, stderr = process.communicate()
            stdout = stdout.decode(encoding="utf-8")
            stderr = stderr.decode(encoding="utf-8")
            feature_df, feature_records = _view_features_output_to_dict(stdout)
            session[SESSION_KEY_FEATURES_DF] = feature_df
            if stderr != "":
                _log(
                    request.url,
                    "Error when retrieving feature data; " + _remove_ansi(stderr),
                )
        else:
            _, feature_records = _view_features_output_to_dict(None)
        response.append(feature_records)

        # (iii) Run MUSIAL on the specified data to view variants.
        if not SESSION_KEY_VARIANTS_DF in session:
            process = subprocess.Popen(
                [
                    os.getenv("JAVA_PATH"),
                    "-jar",
                    PATH_PREFIX + "MUSIAL-v2.2.jar",
                    "view_variants",
                    "-I",
                    PATH_PREFIX + "tmp/" + unique_hex_key + "/results.json",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            stdout, stderr = process.communicate()
            stdout = stdout.decode(encoding="utf-8")
            stderr = stderr.decode(encoding="utf-8")
            variants_df, variants_records = _view_variants_output_to_dict(stdout)
            session[SESSION_KEY_VARIANTS_DF] = variants_df
            if stderr != "":
                _log(
                    request.url,
                    "Error when retrieving variants data; " + _remove_ansi(stderr),
                )
        else:
            _, variants_records = _view_variants_output_to_dict(None)
        response.append(variants_records)
    # If any error is thrown by the server, set response code to 1 (failed).
    except Exception as e:
        response_code = API_CODES["FAILURE_CODE"]
        _log(request.url, _remove_ansi(str(e)))
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(_remove_ansi(str(e)))
            traceback.print_exc()
    finally:
        # Remove temporary files, store results and log in session and return response code.
        if os.path.isdir(PATH_PREFIX + "tmp/" + unique_hex_key):
            shutil.rmtree(PATH_PREFIX + "tmp/" + unique_hex_key)
        _log(request.url, "Retrieved session data.")
        return {
            "code": response_code,
            "content": json.dumps(response).replace("NaN", "null"),
        }


@app.route("/log", methods=["GET"])
def log():
    """TODO"""
    if "LOG" in session:
        return {"code": API_CODES["SUCCESS_CODE"], "content": session["LOG"]}
    else:
        return {"code": API_CODES["FAILURE_CODE"]}


@app.route("/example/data", methods=["GET"])
def example_data():
    return send_file(
        PATH_PREFIX + "static/resources/example_data.zip", as_attachment=True
    )


@app.route("/example/session", methods=["GET"])
def example_session():
    """
    GET route to start an example session.
    """
    # Clear any current session data.
    session.clear()
    # Variables to store output of MUSIAL run.
    result = ""
    response_code = API_CODES["SUCCESS_CODE"]
    try:
        # Load static example session.
        with open(
            PATH_PREFIX + "static/resources/example_session.json", "r"
        ) as example_session_file:
            result = json.load(example_session_file)
    # If any error is thrown by the server, set response code to failed.
    except Exception as e:
        response_code = API_CODES["FAILURE_CODE"]
        session[SESSION_KEY_STATUS] = API_CODES["SESSION_CODE_FAILED"]
        _log(request.url, _remove_ansi(str(e)))
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(str(e))
            traceback.print_exc()
    finally:
        session[API_CODES["RESULT_KEY"]] = result
        session[SESSION_KEY_STATUS] = API_CODES["SESSION_CODE_ACTIVE"]
        if SESSION_KEY_SAMPLES_DF in session:
            del session[SESSION_KEY_SAMPLES_DF]
        if SESSION_KEY_FEATURES_DF in session:
            del session[SESSION_KEY_FEATURES_DF]
        if SESSION_KEY_VARIANTS_DF in session:
            del session[SESSION_KEY_VARIANTS_DF]
        _log(request.url, "Example session initialized.")
        return {"code": response_code}


@app.route("/download_session_data", methods=["GET"])
def download_session_data():
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()
    response_code = API_CODES["SUCCESS_CODE"]
    try:
        # Generate directory to store data temporary in the local file system.
        os.mkdir(PATH_PREFIX + "tmp/" + unique_hex_key)
        with open(
            PATH_PREFIX + "tmp/" + unique_hex_key + "/storage.json.br", "wb+"
        ) as compressed_result:
            # Write compressed session result.
            compressed_result.write(
                brotli.compress(
                    json.dumps(session[API_CODES["RESULT_KEY"]]).encode("utf-8")
                )
            )
            return send_file(
                PATH_PREFIX + "tmp/" + unique_hex_key + "/storage.json.br",
                as_attachment=True,
            )
    except Exception as e:
        response_code = API_CODES["FAILURE_CODE"]
        session[API_CODES["LOG_KEY"]] = _remove_ansi(str(e))
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(session[API_CODES["LOG_KEY"]])
            traceback.print_exc()
        return response_code
    # finally:
    #    shutil.rmtree(PATH_PREFIX + "tmp/" + unique_hex_key)


@app.route("/calc/correlation", methods=["POST"])
def clc_correlation():
    # Inflate the request data and transform into python dictionary.
    inflated_request_data = zlib.decompress(request.data)
    json_string_request_data = inflated_request_data.decode("utf8")
    json_request_data = json.loads(json_string_request_data)
    key1 = json_request_data["field1"]
    key2 = json_request_data["field2"]
    test = json_request_data["test"]
    data_type = json_request_data["data_type"]
    df = None
    if data_type == "samples":
        df = session[SESSION_KEY_SAMPLES_DF]
    elif data_type == "features":
        df = session[SESSION_KEY_FEATURES_DF]
    elif data_type == "variants":
        df = session[SESSION_KEY_VARIANTS_DF]
    try:
        if test == "pearsonr":
            n = "Pearson"
            t, p = sc.stats.pearsonr(df[key1].to_numpy(), df[key2].to_numpy())
            status = "0"
        elif test == "spearmanr":
            n = "Spearman"
            t, p = sc.stats.spearmanr(df[key1].to_numpy(), df[key2].to_numpy())
            status = "0"
        elif test == "kendalltau":
            n = "Kendall's Tau"
            t, p = sc.stats.kendalltau(df[key1].to_numpy(), df[key2].to_numpy())
            status = "0"
        elif test == "cramer":
            n = "Cramer's V"
            t = sc.stats.contingency.association(
                df.groupby([key1, key2])
                .size()
                .unstack()
                .replace(np.nan, 0)
                .astype(int)
                .to_numpy(),
                method="cramer",
            )
            p = 0.0
            status = "0"
        else:
            n = "None"
            t = 0.0
            p = 0.0
            status = "1"
    except Exception as e:
        t = 0.0
        p = 0.0
        status = "1"
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(str(e))
            traceback.print_exc()
    return [n, format(t, ".6g"), format(p, ".6g"), status]


@app.route("/calc/forms_graph", methods=["POST"])
def clc_feature_graph():
    def node_annotations(x):
        annotations = copy.deepcopy(x)
        if "variants" in annotations and annotations["variants"] != "":
            annotations["variants"] = _brotli_decompress(annotations["variants"])
        return annotations

    def node_size(x):
        f = (x / len(storage["samples"].keys())) * 100
        return round(8 / (1 + 2 * (math.exp(-0.05)) ** f), 1)
    
    def node_color(x, default):
        if x["name"] == "reference":
            return "#FFBA08"
        elif "novel_stops" in x["annotations"]:
            return "#FE4848"
        else :
            return default

    def distance(x,y) :
        x = set(x)
        y = set(y)
        return len(x.union(y)) - len(x.intersection(y))
    
    def graph_topology(forms) -> list:
        # Extract per form variants.
        forms_variants = { }
        for form in forms :
            if "novel_stops" in form["annotations"] :
                continue
            if form["name"] == "reference" :
                forms_variants["reference"] = [ ]
            else :
                forms_variants[ form["name"] ] = _brotli_decompress(copy.deepcopy(form["annotations"]["variants"])).split(";")
        # Establish links between low distance nodes.
        forms_variants_keys = list( forms_variants.keys( ) )
        links = [ ]
        for i in forms_variants_keys :
            d = np.inf
            parent = False
            for j in forms_variants_keys :
                if len( forms_variants[j] ) < len( forms_variants[ i ] ) :
                    _d = distance(forms_variants[i], forms_variants[j])
                    if _d < d :
                        d = _d
                        parent = j
            if parent :
                links.append({
                    "source": "Proteoform " + parent,
                    "target": "Proteoform " + i,
                    "value": -1 * d,
                    "lineStyle": {
                        "type": "solid",
                        "color": "#9ba6bd",
                        "width": 1,
                        "curveness": 0.2,
                    },
                    "type": "relation"
                })
        return links

    symbol_proteoform = "path://M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM184 128h92c50.8 0 92 41.2 92 92s-41.2 92-92 92H208v48c0 13.3-10.7 24-24 24s-24-10.7-24-24V288 152c0-13.3 10.7-24 24-24zm92 136c24.3 0 44-19.7 44-44s-19.7-44-44-44H208v88h68z"
    symbol_allele = "path://M256,512A256,256,0,1,0,256,0a256,256,0,1,0,0,512zm0-400c9.1,0,17.4,5.1,21.5,13.3l104,208c5.9,11.9,1.1,26.3-10.7,32.2s-26.3,1.1-32.2-10.7L321.2,320H190.8l-17.4,34.7c-5.9,11.9-20.3,16.7-32.2,10.7s-16.7-20.3-10.7-32.2l104-208c4.1-8.1,12.4-13.3,21.5-13.3zm0,77.7L214.8,272h82.3L256,189.7z"

    # Inflate the request data and transform into python dictionary.
    inflated_request_data = zlib.decompress(request.data)
    json_string_request_data = inflated_request_data.decode("utf8")
    json_request_data = json.loads(json_string_request_data)
    storage = session[API_CODES["RESULT_KEY"]]
    feature = json_request_data["feature"]
    nodes = []
    links = []
    status = "0"
    try:
        if storage["features"][feature]["type"] == "coding":
            for proteoform in storage["features"][feature]["proteoforms"].values():
                proteoform_node = {
                    "name": "Proteoform " + proteoform["name"],
                    "itemStyle": {
                        "color": node_color(proteoform, "#607196"),
                        "borderWidth": 0,
                        "borderColor": "transparent",
                    },
                    "symbol": symbol_proteoform,
                    "value": float(proteoform["annotations"]["variable_positions"]),
                    "annotations": node_annotations(proteoform["annotations"]),
                    "isNode": True,
                }
                proteoform_weight = 0
                for allele_name in proteoform["occurrence"]:
                    allele = storage["features"][feature]["alleles"][allele_name]
                    allele_weight = len(allele["occurrence"])
                    allele_node = {
                        "name": "Allele " + allele_name,
                        "itemStyle": {
                            "color": node_color(allele, "#9ba6bd"),
                            "borderWidth": 0,
                            "borderColor": "transparent",
                        },
                        "symbol": symbol_allele,
                        "value": float(allele["annotations"]["variable_positions"]),
                        "annotations": node_annotations(allele["annotations"]),
                        "isNode": True,
                        "symbolSize": node_size(allele_weight),
                    }
                    proteoform_weight += allele_weight
                    nodes.append(allele_node)
                    links.append(
                        {
                            "source": "Proteoform " + proteoform["name"],
                            "target": "Allele " + allele_name,
                            "value": allele_weight,
                            "lineStyle": {
                                "type": "dotted",
                                "color": "#cbd0e0",
                                "width": 2,
                            },
                            "type": "interconnection"
                        }
                    )
                proteoform_node["symbolSize"] = node_size(proteoform_weight)
                nodes.append(proteoform_node)
            links += graph_topology(storage["features"][feature]["proteoforms"].values())
        else:
            for allele in storage["features"][feature]["alleles"].values():
                allele_weight = len(allele["occurrence"])
                allele_node = {
                    "name": "Allele " + allele["name"],
                    "itemStyle": {
                        "color": node_color(allele, "#9ba6bd"),
                        "borderWidth": 0,
                        "borderColor": "transparent",
                    },
                    "symbol": symbol_allele,
                    "value": float(allele["annotations"]["variable_positions"]),
                    "annotations": node_annotations(allele["annotations"]),
                    "isNode": True,
                    "symbolSize": allele_weight,
                }
                nodes.append(allele_node)
            links += graph_topology(storage["features"][feature]["alleles"].values())
    except Exception as e:
        nodes = []
        links = []
        status = "1"
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(str(e))
            traceback.print_exc()
    return [nodes, links, status]


@app.route("/extension/feature_proteoforms", methods=["GET"])
def extension_feature_proteoforms():
    target = request.args.get("target")
    if (
        API_CODES["RESULT_KEY"] in session
        and target in session[API_CODES["RESULT_KEY"]]["features"]
        and session[API_CODES["RESULT_KEY"]]["features"][target]["type"] == "coding"
    ):
        # Decode PDB format structure into raw string, if it exists.
        target_data = copy.deepcopy(
            session[API_CODES["RESULT_KEY"]]["features"][target]
        )
        target_data["samples"] = copy.deepcopy(
            session[API_CODES["RESULT_KEY"]]["samples"]
        )
        if "structure" in target_data:
            target_data["structure"] = _brotli_decompress(target_data["structure"])
        return render_template(
            "extension_feature_proteoforms.html",
            data=target_data,
            target=target,
        )
    else:
        print(target)
        print(API_CODES["RESULT_KEY"] in session)
        print(target in session[API_CODES["RESULT_KEY"]]["features"])
        print(session[API_CODES["RESULT_KEY"]]["features"][target]["type"] == "coding")
        return API_CODES["FAILURE_CODE"]


def _view_features_output_to_dict(out):
    if SESSION_KEY_FEATURES_DF in session:
        content_df = copy.deepcopy(session[SESSION_KEY_FEATURES_DF])
        columns = list(content_df.columns)
    else:
        # Remove MUSIAL view specific comment lines from output.
        records = list(
            filter(lambda line: line != "", _remove_ansi(out).split("\n")[4:])
        )
        columns = records[0].split("\t")
        string_content = "\n".join(
            list(filter(lambda line: line != "", _remove_ansi(out).split("\n")[4:]))
        )
        content_df = pd.read_csv(StringIO(string_content), sep="\t")

    records = content_df.to_dict(orient="records")
    return content_df, {
        "columns": columns,
        "records": records,
        "dashboard": {
            "overview_parallel": mwchart.features_overview_parallel(content_df),
            "forms_graph": mwchart.features_forms_template(),
        },
    }


def _view_samples_output_to_dict(out):
    if SESSION_KEY_SAMPLES_DF in session:
        content_df = copy.deepcopy(session[SESSION_KEY_SAMPLES_DF])
        columns = list(content_df.columns)
    else:
        # Remove MUSIAL view specific comment lines from output.
        records = list(
            filter(lambda line: line != "", _remove_ansi(out).split("\n")[4:])
        )
        columns = records[0].split("\t")
        string_content = "\n".join(
            list(filter(lambda line: line != "", _remove_ansi(out).split("\n")[4:]))
        )
        content_df = pd.read_csv(StringIO(string_content), sep="\t")

    counts = {}
    for column in content_df:
        if column != "name":
            counts[column] = content_df.groupby(column)["name"].count().to_dict()
    records = content_df.to_dict(orient="records")
    return content_df, {
        "columns": columns,
        "records": records,
        "counts": counts,
        "dashboard": {
            "overview_area": mwchart.samples_overview_bar(),
            "clustering_map_allele": mwchart.samples_clustering_map(
                *session[SESSION_KEY_SAMPLES_CLUSTERING]["allele"]
            ),
            "clustering_map_proteoform": mwchart.samples_clustering_map(
                *session[SESSION_KEY_SAMPLES_CLUSTERING]["proteoform"]
            ),
        },
    }


def _view_variants_output_to_dict(out):
    if SESSION_KEY_VARIANTS_DF in session:
        content_df = copy.deepcopy(session[SESSION_KEY_VARIANTS_DF])
        columns = list(content_df.columns)
    else:
        # Remove MUSIAL view specific comment lines from output.
        records = list(
            filter(lambda line: line != "", _remove_ansi(out).split("\n")[4:])
        )
        columns = records[0].split("\t")
        string_content = "\n".join(
            list(filter(lambda line: line != "", _remove_ansi(out).split("\n")[4:]))
        )
        content_df = pd.read_csv(StringIO(string_content), sep="\t")
    records = content_df.to_dict(orient="records")
    return content_df, {
        "columns": columns,
        "records": records,
        "dashboard": {
            "variants_bar": mwchart.variants_overview_bar(
                content_df,
                session[API_CODES["RESULT_KEY"]]["referenceLength"],
                # FIXME: Will cause a bug, if entry does not exist!
                session[SESSION_KEY_FEATURES_DF],
            ),
        },
    }


def _run_sample_clustering(form_type):
    # Collect variants from sequence alignment per feature.
    storage = session[API_CODES["RESULT_KEY"]]
    unique_hex_key = _generate_random_string()
    per_feature_sequence_records = {}
    try:
        os.makedirs(PATH_PREFIX + "tmp/" + unique_hex_key)
        with open(
            PATH_PREFIX + "tmp/" + unique_hex_key + "/results.json", "w+"
        ) as session_results:
            session_results.write(json.dumps(storage))
        if form_type == "allele":
            content_type = "nucleotide"
        elif form_type == "proteoform":
            content_type = "aminoacid"
        for feature_name in storage["features"].keys():
            process = subprocess.Popen(
                [
                    os.getenv("JAVA_PATH"),
                    "-jar",
                    PATH_PREFIX + "MUSIAL-v2.2.jar",
                    "export_sequence",
                    "-I",
                    PATH_PREFIX + "tmp/" + unique_hex_key + "/results.json",
                    "-O",
                    PATH_PREFIX
                    + "tmp/"
                    + unique_hex_key
                    + "/sequences_"
                    + feature_name
                    + ".fasta",
                    "-c",
                    content_type,
                    "-F",
                    feature_name,
                    "-a",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            stdout, stderr = process.communicate()
            stdout = stdout.decode()
            stderr = stderr.decode()
            if stderr != "":
                return (None, None, {}, [], [])
            else:
                per_feature_sequence_records[feature_name] = SeqIO.parse(
                    PATH_PREFIX
                    + "tmp/"
                    + unique_hex_key
                    + "/sequences_"
                    + feature_name
                    + ".fasta",
                    "fasta",
                )
    finally:
        shutil.rmtree(PATH_PREFIX + "tmp/" + unique_hex_key)
    # Cluster samples with a SOM.
    return mwclustering.cluster_sequences(
        per_feature_sequence_records,
        {
            "nodes_x": 5,
            "nodes_y": 5,
            "sigma": 3,
            "learning_rate": 1,
            "neighborhood_function": "triangle",
        },
    )


def _generate_random_string():
    return "".join(
        random.SystemRandom().choice(string.ascii_letters + string.digits)
        for _ in range(10)
    )


def _remove_ansi(text):
    ansi_remove_expression = re.compile(r"(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]")
    return ansi_remove_expression.sub("", text)


def _log(url: str, content: str):
    if not "LOG" in session:
        session["LOG"] = ""
    session["LOG"] += (
        "> " + str(datetime.now()) + ",<b>" + str(url) + "</b><br/>" + content + "<br/>"
    )


def _brotli_decompress(content: str):
    return brotli.decompress(base64.standard_b64decode(content)).decode()
