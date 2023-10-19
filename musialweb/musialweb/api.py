from musialweb import app
from flask import request, session, send_file, render_template
from flask_session import Session
from datetime import timedelta, datetime
from operator import methodcaller
from dotenv import load_dotenv
from io import StringIO
from Bio import SeqIO
from umap.umap_ import UMAP
from sklearn.decomposition import PCA
import json, zlib, os, subprocess, shutil, brotli, random, string, re, brotli, base64, copy, traceback
import pandas as pd
import numpy as np
import scipy as sc
import musialweb.chart as mwchart

""" Load variables from local file system. """
load_dotenv()

""" Set session configuration parameters. """
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_KEY_PREFIX"] = "musial:"
app.config["SESSION_COOKIE_NAME"] = "musial:session"
app.config["SESSION_FILE_DIR"] = "./session/"
app.config["SESSION_USE_SIGNER"] = True
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=5.0)
app.config["SESSION_FILE_THRESHOLD"] = 15000
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024  # Limit content lengths to 1 GB.
""" Set constant session keys. """
SESSION_KEY_REFERENCE_SEQUENCE = "UkVGRVJFTkNFX1NFUVVFTkNF"
SESSION_KEY_STATUS = "U1RBVFVT"
SESSION_KEY_SAMPLES_DF = "U0FNUExFU19ERg"
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
        os.makedirs("./tmp/" + unique_hex_key)
        # Inflate the request data and transform into python dictionary.
        inflated_request_data = zlib.decompress(request.data)
        json_string_request_data = inflated_request_data.decode("utf8")
        json_request_data = json.loads(json_string_request_data)
        # Write reference .fasta to local file and set path in run specification.
        with open(
            "./tmp/" + unique_hex_key + "/reference.fasta", "w+"
        ) as reference_fasta_file:
            reference_fasta_file.write(json_request_data["referenceSequenceFile"])
            json_request_data["referenceSequenceFile"] = (
                "./tmp/" + unique_hex_key + "/reference.fasta"
            )
        # Write reference .gff3 to local file and set path in run specification.
        with open(
            "./tmp/" + unique_hex_key + "/reference.gff3", "w+"
        ) as reference_gff3_file:
            reference_gff3_file.write(json_request_data["referenceFeaturesFile"])
            json_request_data["referenceFeaturesFile"] = (
                "./tmp/" + unique_hex_key + "/reference.gff3"
            )
        # For each specified feature, write .pdb to local file and set path in run specification, if provided.
        for feature in json_request_data["features"].keys():
            if "pdbFile" in json_request_data["features"][feature]:
                with open(
                    "./tmp/" + unique_hex_key + "/" + feature + ".pdb", "w+"
                ) as feature_pdb_file:
                    feature_pdb_file.write(
                        json_request_data["features"][feature]["pdbFile"]
                    )
                    json_request_data["features"][feature]["pdbFile"] = (
                        "./tmp/" + unique_hex_key + "/" + feature + ".pdb"
                    )
        # For each specified sample, write .vcf to local file and set path in run specification.
        for sample in json_request_data["samples"].keys():
            with open(
                "./tmp/" + unique_hex_key + "/" + sample + ".vcf", "w+"
            ) as sample_vcf_file:
                sample_vcf_file.write(json_request_data["samples"][sample]["vcfFile"])
                json_request_data["samples"][sample]["vcfFile"] = (
                    "./tmp/" + unique_hex_key + "/" + sample + ".vcf"
                )
        # Write the adjusted request (i.e. used as MUSIAL build configuration) to local file.
        with open(
            "./tmp/" + unique_hex_key + "/configuration.json", "w+"
        ) as build_configuration_file:
            json_request_data["output"] = "./tmp/" + unique_hex_key + "/output.json"
            json.dump(json_request_data, build_configuration_file)
        # Run MUSIAL on the specified data.
        process = subprocess.Popen(
            [
                os.getenv("JAVA_PATH"),
                "-Xms4G",
                "-Xmx8G",
                "-jar",
                "./MUSIAL-v2.2.jar",
                "build",
                "-c",
                "./tmp/" + unique_hex_key + "/configuration.json",
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
            with open("./tmp/" + unique_hex_key + "/output.json", "r") as run_out_file:
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
        # shutil.rmtree("./tmp/" + unique_hex_key)
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
        ):
            os.makedirs("./tmp/" + unique_hex_key)
            with open(
                "./tmp/" + unique_hex_key + "/results.json", "w+"
            ) as session_results:
                session_results.write(json.dumps(session[API_CODES["RESULT_KEY"]]))

        # (i) Run MUSIAL on the specified data to view samples.
        if not SESSION_KEY_SAMPLES_DF in session:
            process = subprocess.Popen(
                [
                    os.getenv("JAVA_PATH"),
                    "-jar",
                    "./MUSIAL-v2.2.jar",
                    "view_samples",
                    "-I",
                    "./tmp/" + unique_hex_key + "/results.json",
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
                    "./MUSIAL-v2.2.jar",
                    "view_features",
                    "-I",
                    "./tmp/" + unique_hex_key + "/results.json",
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
                    "./MUSIAL-v2.2.jar",
                    "view_variants",
                    "-I",
                    "./tmp/" + unique_hex_key + "/results.json",
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
        if os.path.isdir("./tmp/" + unique_hex_key):
            shutil.rmtree("./tmp/" + unique_hex_key)
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
    return send_file("./static/resources/example_data.zip", as_attachment=True)


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
            "./static/resources/example_session.json", "r"
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


@app.route("/download_session_storage", methods=["GET"])
def download_session_storage():
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()
    response_code = API_CODES["SUCCESS_CODE"]
    try:
        # Generate directory to store data temporary in the local file system.
        os.mkdir("./tmp/" + unique_hex_key)
        with open(
            "./tmp/" + unique_hex_key + "/storage.json.br", "wb+"
        ) as compressed_result:
            # Write compressed session result.
            compressed_result.write(
                brotli.compress(
                    json.dumps(session[API_CODES["RESULT_KEY"]]).encode("utf-8")
                )
            )
            return send_file(
                "./tmp/" + unique_hex_key + "/storage.json.br",
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
    #    shutil.rmtree("./tmp/" + unique_hex_key)


@app.route("/calc/sample_correlation", methods=["POST"])
def clc_sample_correlation():
    # Inflate the request data and transform into python dictionary.
    inflated_request_data = zlib.decompress(request.data)
    json_string_request_data = inflated_request_data.decode("utf8")
    json_request_data = json.loads(json_string_request_data)
    samples_df = session[SESSION_KEY_SAMPLES_DF]
    key1 = json_request_data["field1"]
    key2 = json_request_data["field2"]
    test = json_request_data["test"]
    try:
        if test == "pearsonr":
            n = "Pearson"
            t, p = sc.stats.pearsonr(
                samples_df[key1].to_numpy(), samples_df[key2].to_numpy()
            )
            status = "0"
        elif test == "spearmanr":
            n = "Spearman"
            t, p = sc.stats.spearmanr(
                samples_df[key1].to_numpy(), samples_df[key2].to_numpy()
            )
            status = "0"
        elif test == "kendalltau":
            n = "Kendall's Tau"
            t, p = sc.stats.kendalltau(
                samples_df[key1].to_numpy(), samples_df[key2].to_numpy()
            )
            status = "0"
        elif test == "cramer":
            n = "Cramer's V"
            t = sc.stats.contingency.association(
                samples_df.groupby([key1, key2])
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
    return [n, round(t, 2), format(p, ".3g"), status]


@app.route("/calc/sample_clustering", methods=["POST"])
def clc_sample_clustering():
    # Inflate the request data and transform into python dictionary to extract parameters.
    inflated_request_data = zlib.decompress(request.data)
    json_string_request_data = inflated_request_data.decode("utf8")
    json_request_data = json.loads(json_string_request_data)
    feature = json_request_data["feature"]
    form_type = json_request_data["type"]
    m = json_request_data["metric"]
    # Collect variants from sequence alignment per feature.
    feature_variants = {}
    storage = session[API_CODES["RESULT_KEY"]]
    unique_hex_key = _generate_random_string()
    feature_variants_transform = {}
    transform_index = 1
    try:
        os.makedirs("./tmp/" + unique_hex_key)
        with open("./tmp/" + unique_hex_key + "/results.json", "w+") as session_results:
            session_results.write(json.dumps(storage))
        if form_type == "allele":
            content_type = "nucleotide"
        elif form_type == "proteoform":
            content_type = "aminoacid"
        process = subprocess.Popen(
            [
                os.getenv("JAVA_PATH"),
                "-jar",
                "./MUSIAL-v2.2.jar",
                "export_sequence",
                "-I",
                "./tmp/" + unique_hex_key + "/results.json",
                "-O",
                "./tmp/" + unique_hex_key + "/sequences_" + feature + ".fasta",
                "-c",
                content_type,
                "-F",
                feature,
                "-g",
                "-a",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = process.communicate()
        stdout = stdout.decode()
        stderr = stderr.decode()
        if stderr != "":
            _log(
                request.url,
                "Error during sample cluster computation; " + _remove_ansi(stderr),
            )
            return {"code": API_CODES["FAILURE_CODE"]}
        else:
            records = SeqIO.parse(
                "./tmp/" + unique_hex_key + "/sequences_" + feature + ".fasta",
                "fasta",
            )
            for record in records:
                record_sequence = list(str(record.seq))
                variants = []
                for i in range(len(record_sequence)):
                    variant = str(i) + "." + record_sequence[i]
                    variants.append(variant)
                    if not variant in feature_variants_transform:
                        feature_variants_transform[variant] = transform_index
                        transform_index += 1
                feature_variants[record.id] = copy.deepcopy(variants)
    finally:
        shutil.rmtree("./tmp/" + unique_hex_key)
    # Assert variants to samples.
    form_variants = []
    response = {}
    for sample in storage["samples"]:
        variants = []
        form_name = storage["samples"][sample]["annotations"][form_type + "_" + feature]
        profile = form_type + "." + feature + "." + form_name
        variants += feature_variants[form_name]
        if profile in response:
            response[profile]["samples"].append(sample)
        else:
            response[profile] = {"samples": [sample], "variants": variants}
            form_variants.append(variants)
    form_variants_transform = [
        list(map(lambda v: feature_variants_transform[v], fv)) for fv in form_variants
    ]

    # n_components = min(len(form_variants_transform[0]), len(form_variants_transform))
    # pca_model = PCA(n_components=n_components)
    # embedding = pca_model.fit_transform(form_variants_transform)

    umap_model = UMAP(
        n_neighbors=round(len(form_variants_transform) / 4), metric=m, min_dist=0.1
    )
    embedding = umap_model.fit_transform(form_variants_transform)

    index = 0
    for profile in response:
        response[profile]["transform"] = [
            float(embedding[index][0]),
            float(embedding[index][1]),
        ]
        index += 1

    return response


@app.route("/calc/forms_sunburst", methods=["POST"])
def clc_feature_sunburst():
    def color(x):
        if x == 0.0:
            return "#e4e5ed"
        elif x < 1.0:
            return "#6d81ad"
        elif x < 10.0:
            return "#FFB000"
        else:
            return "#DC267F"

    def annotations(x):
        annotations = copy.deepcopy(x)
        if "variants" in annotations and annotations["variants"] != "":
            annotations["variants"] = _brotli_decompress(annotations["variants"])
        return annotations

    # Inflate the request data and transform into python dictionary.
    inflated_request_data = zlib.decompress(request.data)
    json_string_request_data = inflated_request_data.decode("utf8")
    json_request_data = json.loads(json_string_request_data)
    storage = session[API_CODES["RESULT_KEY"]]
    feature = json_request_data["feature"]
    status = "0"
    tree = {
        "name": feature,
        "children": [],
        "label": {"show": True, "rotate": 0},
        "itemStyle": {
            "color": "#cbd0e0",
            "borderWidth": 6,
            "borderRadius": 6,
            "borderColor": "white",
        },
        "level": "Gene",
    }
    try:
        if storage["features"][feature]["type"] == "coding":
            for proteoform in sorted(
                storage["features"][feature]["proteoforms"].values(),
                key=lambda e: float(e["annotations"]["variable_positions"]),
                reverse=True,
            ):
                proteoform_entry = {
                    "name": proteoform["name"],
                    "children": [],
                    "itemStyle": {
                        "color": color(
                            float(proteoform["annotations"]["variable_positions"])
                        ),
                        "borderWidth": 0,
                        "borderColor": "transparent",
                    },
                    "annotations": annotations(proteoform["annotations"]),
                    "level": "Proteoform",
                }
                proteoform_weight = 0
                for allele_name in proteoform["occurrence"]:
                    allele = storage["features"][feature]["alleles"][allele_name]
                    allele_entry = {
                        "name": allele_name,
                        "children": [],
                        "itemStyle": {
                            "color": color(
                                float(allele["annotations"]["variable_positions"])
                            ),
                            "borderWidth": 0,
                            "borderColor": "transparent",
                        },
                        "annotations": annotations(allele["annotations"]),
                        "level": "Allele",
                        "value": len(allele["occurrence"]),
                    }
                    proteoform_weight += len(allele["occurrence"])
                    proteoform_entry["children"].append(allele_entry)
                proteoform_entry["value"] = proteoform_weight
                proteoform_entry["children"] = sorted(
                    proteoform_entry["children"],
                    key=lambda e: float(e["annotations"]["variable_positions"]),
                    reverse=True,
                )
                tree["children"].append(proteoform_entry)
        else:
            for allele in sorted(
                storage["features"][feature]["alleles"].values(),
                key=lambda e: float(e["annotations"]["variable_positions"]),
                reverse=True,
            ):
                allele_entry = {
                    "name": allele["name"],
                    "children": [],
                    "itemStyle": {
                        "color": color(
                            float(allele["annotations"]["variable_positions"])
                        ),
                        "borderWidth": 0,
                        "borderColor": "transparent",
                    },
                    "value": float(allele["annotations"]["variable_positions"]),
                    "annotations": annotations(allele["annotations"]),
                    "level": "Allele",
                    "value": len(allele["occurrence"]),
                }
                tree["children"].append(allele_entry)
    except Exception as e:
        tree = []
        status = "1"
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(str(e))
            traceback.print_exc()
    return [tree, status]


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
            "forms_sunburst": mwchart.features_forms_sunburst(),
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
            "overview_area": mwchart.samples_overview_area(),
            "clustering_scatter": mwchart.samples_clustering_scatter(),
            "correlation_bar": mwchart.samples_correlation_bar(),
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
