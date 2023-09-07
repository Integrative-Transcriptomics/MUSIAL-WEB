from musialweb import app
from flask import request, session, send_file
from flask_session import Session
from datetime import timedelta, datetime
from operator import methodcaller
from dotenv import load_dotenv
from io import StringIO
from Bio import SeqIO
from umap.umap_ import UMAP
import json, zlib, os, subprocess, shutil, brotli, random, string, re, base64, warnings
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import scipy as sc

""" Load variables from local file system. """
load_dotenv()

""" Set session configuration parameters. """
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_KEY_PREFIX"] = "musial:"
app.config["SESSION_COOKIE_NAME"] = "musial_session"
app.config["SESSION_FILE_DIR"] = "./session/"
app.config["SESSION_USE_SIGNER"] = True
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=5.0)
app.config["SESSION_FILE_THRESHOLD"] = 15000
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024  # Limit content lengths to 1 GB.
""" Set constant session keys. """
SESSION_KEY_REFERENCE_SEQUENCE = "U0VTU0lPTl9LRVlfUkVGRVJFTkNFX1NFUVVFTkNF"
SESSION_KEY_STATUS = "U0VTU0lPTl9TQVRVU19LRVk"
SESSION_KEY_SAMPLES_DF = "U0VTU0lPTl9LRVlfU0FNUExFU19ERg"
SESSION_KEY_FEATURES_DF = "U0VTU0lPTl9LRVlfRkVBVFVSRVNfREY"
SESSION_KEY_VARIANTS_DF = "U0VTU0lPTl9LRVlfVkFSSUFOVFNfREY"
""" Set API parameters. """
API_CODES = {
    "SUCCESS_CODE": "0",  # Response return code for successful requests.
    "FAILURE_CODE": "1",  # Response return code for failed requests (due to server internal error).
    "SESSION_CODE_NONE": "0",  # Response code indicating no active session.
    "SESSION_CODE_ACTIVE": "1",  # Response code  indicating an active session.
    "SESSION_CODE_FAILED": "2",  # Response code  indicating a failed session.
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
        return API_CODES["SESSION_CODE_NONE"]
    else:
        return session[SESSION_KEY_STATUS]


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
            _log(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
            if DEBUG:
                print("\033[41m ERROR \033[0m")
                print(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        # Else, parse and store output of MUSIAL.
        else:
            with open("./tmp/" + unique_hex_key + "/output.json", "r") as run_out_file:
                json_result_data = json.load(run_out_file)
                result = json_result_data
    # If any error is thrown by the server, set response code to 1 (failed).
    except Exception as e:
        response_code = API_CODES["FAILURE_CODE"]
        session[SESSION_KEY_STATUS] = API_CODES["SESSION_CODE_FAILED"]
        _log(_remove_ansi(str(e)))
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(_remove_ansi(str(e)))
    finally:
        # Remove temporary files, store results and log in session and return response code.
        shutil.rmtree("./tmp/" + unique_hex_key)
        session[API_CODES["RESULT_KEY"]] = result
        session[SESSION_KEY_STATUS] = API_CODES["SESSION_CODE_ACTIVE"]
        _log(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        if DEBUG:
            print("\033[46m LOG \033[0m")
            print(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        return response_code


@app.route("/session/data", methods=["GET"])
def session_data():
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()
    # Variables to store output of MUSIAL run.
    stdout = ""
    stderr = ""
    response = []
    try:
        # Generate directory to store data temporary in the local file system.
        os.makedirs("./tmp/" + unique_hex_key)
        with open("./tmp/" + unique_hex_key + "/results.json", "w+") as session_results:
            session_results.write(json.dumps(session[API_CODES["RESULT_KEY"]]))

        # (i) Run MUSIAL on the specified data to view samples.
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
        response.append(sample_records)
        if stderr != "":
            _log("Error when retrieving sample data; " + _remove_ansi(stderr))

        # (ii) Run MUSIAL on the specified data to view features.
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
        response.append(_view_output_to_dict(stdout))
        if stderr != "":
            _log("Error when retrieving feature data; " + _remove_ansi(stderr))

        # (iii) Run MUSIAL on the specified data to view variants.
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
        response.append(_view_output_to_dict(stdout))
        if stderr != "":
            _log("Error when retrieving variants data; " + _remove_ansi(stderr))
    # If any error is thrown by the server, set response code to 1 (failed).
    except Exception as e:
        response = API_CODES["FAILURE_CODE"]
        _log(_remove_ansi(str(e)))
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(_remove_ansi(str(e)))
    finally:
        # Remove temporary files, store results and log in session and return response code.
        shutil.rmtree("./tmp/" + unique_hex_key)
        _log("Retrieved session data.")
        return response


@app.route("/log", methods=["GET"])
def log():
    if "LOG" in session:
        return session["LOG"]
    else:
        return API_CODES["FAILURE_CODE"]


@app.route("/example/data", methods=["GET"])
def example_data():
    return send_file("./static/resources/example_data.zip", as_attachment=True)


@app.route("/example/session", methods=["GET"])
def example_session():
    """
    GET route to start an example session.
    """
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
        _log(_remove_ansi(str(e)))
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(str(e))
    finally:
        session[API_CODES["RESULT_KEY"]] = result
        session[SESSION_KEY_STATUS] = API_CODES["SESSION_CODE_ACTIVE"]
        _log("Example session initialized.")
        return response_code


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
    return [n, round(t, 2), format(p, ".3g"), status]


@app.route("/calc/sample_clustering", methods=["POST"])
def clc_sample_clustering():
    # Inflate the request data and transform into python dictionary to extract parameters.
    inflated_request_data = zlib.decompress(request.data)
    json_string_request_data = inflated_request_data.decode("utf8")
    json_request_data = json.loads(json_string_request_data)
    features = json_request_data["features"]
    form_type = json_request_data["type"]
    # Collect variants from sequence alignment per feature.
    feature_variants = {}
    storage = session[API_CODES["RESULT_KEY"]]
    unique_hex_key = _generate_random_string()
    try:
        os.makedirs("./tmp/" + unique_hex_key)
        with open("./tmp/" + unique_hex_key + "/results.json", "w+") as session_results:
            session_results.write(json.dumps(storage))
        if form_type == "allele":
            content_type = "nucleotide"
        elif form_type == "proteoform":
            content_type = "aminoacid"
        for feature in features:
            feature_variants[feature] = {}
            process = subprocess.Popen(
                [
                    os.getenv("JAVA_PATH"),
                    "-jar",
                    "./MUSIAL-v2.2.jar",
                    "export_sequence",
                    "-I",
                    "./tmp/" + unique_hex_key + "/results.json",
                    "-O",
                    "./tmp/" + unique_hex_key + "/sequences" + feature + ".fasta",
                    "-a",
                    "-c",
                    content_type,
                    "-F",
                    feature,
                    "-g",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            stdout, stderr = process.communicate()
            stdout = stdout.decode()
            stderr = stderr.decode()
            if stderr != "":
                _log("Error during sample cluster computation; " + _remove_ansi(stderr))
                return "1"
            else:
                records = SeqIO.parse(
                    "./tmp/" + unique_hex_key + "/sequences" + feature + ".fasta",
                    "fasta",
                )
                for record in records:
                    record_sequence = list(str(record.seq))
                    feature_variants[feature][record.id] = [
                        str(i) + "." + feature + "." + record_sequence[i]
                        for i in range(len(record_sequence))
                    ]
    finally:
        shutil.rmtree("./tmp/" + unique_hex_key)
    # Assert variants to samples.
    samples_variants = []
    response = {}
    for sample in storage["samples"]:
        profile = []
        variants = []
        for feature in features:
            form_name = storage["samples"][sample]["annotations"][
                form_type + "_" + feature
            ]
            profile.append(form_type + "." + feature + "." + form_name)
            variants += feature_variants[feature][form_name]
        response[sample] = {"profile": ":".join(profile), "variants": variants}
        samples_variants.append(variants)
    samples_variants_flat = list(set(np.ravel(samples_variants)))
    int_transform = {
        samples_variants_flat[i]: i for i in range(len(samples_variants_flat))
    }
    samples_variants_transform = [
        list(map(lambda v: int_transform[v], sample_variants))
        for sample_variants in samples_variants
    ]
    umap_model = UMAP(n_neighbors=10, metric="hamming", min_dist=1.0)
    embedding = umap_model.fit_transform(samples_variants_transform)
    index = 0
    for sample in storage["samples"]:
        response[sample]["transform"] = [
            float(embedding[index][0]),
            float(embedding[index][1]),
        ]
        index += 1
    return response


def _generate_random_string():
    return "".join(
        random.SystemRandom().choice(string.ascii_letters + string.digits)
        for _ in range(10)
    )


def _remove_ansi(text):
    ansi_remove_expression = re.compile(r"(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]")
    return ansi_remove_expression.sub("", text)


def _view_samples_output_to_dict(out):
    # Remove MUSIAL view specific comment lines.
    records = list(filter(lambda line: line != "", _remove_ansi(out).split("\n")[4:]))
    columns = records[0].split("\t")
    string_content = "\n".join(
        list(filter(lambda line: line != "", _remove_ansi(out).split("\n")[4:]))
    )
    content_df = pd.read_csv(StringIO(string_content), sep="\t")
    records = content_df.to_dict(orient="records")
    # Construct EChart option for variants counts.
    substitution_counts, substitution_bins, _ = plt.hist(
        content_df["number_of_substitutions"],
        bins=min([20, content_df["number_of_substitutions"].max()]),
        range=(0, content_df["number_of_substitutions"].max()),
    )
    insertion_counts, insertion_bins, _ = plt.hist(
        content_df["number_of_insertions"],
        bins=min([20, content_df["number_of_insertions"].max()]),
        range=(0, content_df["number_of_insertions"].max()),
    )
    deletion_counts, deletion_bins, _ = plt.hist(
        content_df["number_of_deletions"],
        bins=min([20, content_df["number_of_deletions"].max()]),
        range=(0, content_df["number_of_deletions"].max()),
    )
    return content_df, {
        "columns": columns,
        "records": records,
        "dashboard": {
            "variants_area": _construct_samples_variants_area(
                list(substitution_counts),
                [round(value) for value in substitution_bins],
                list(insertion_counts),
                [round(value) for value in insertion_bins],
                list(deletion_counts),
                [round(value) for value in deletion_bins],
            ),
            "clustering_scatter": _construct_samples_clustering_scatter(),
            "correlation_bar": _construct_samples_correlation_bar(),
        },
    }


def _construct_samples_variants_area(
    c_substitution, b_substitution, c_insertions, b_insertions, c_deletions, b_deletions
):
    return {
        "title": {
            "top": "0",
            "left": 0,
            "text": "Binned Sample Count by No. Variants",
            "textStyle": {"fontWeight": "lighter", "fontStyle": "oblique"},
        },
        "legend": {"selectedMode": False, "right": "5%"},
        "grid": [
            {"top": "10%", "left": "10%", "height": "24%", "width": "85%"},
            {"top": "39%", "left": "10%", "height": "24%", "width": "85%"},
            {"top": "68%", "left": "10%", "height": "24%", "width": "85%"},
        ],
        "xAxis": [
            {
                "type": "category",
                "gridIndex": 0,
                "data": b_substitution,
            },
            {
                "type": "category",
                "gridIndex": 1,
                "data": b_insertions,
            },
            {
                "type": "category",
                "gridIndex": 2,
                "data": b_deletions,
                "name": "No. Variants",
                "nameLocation": "center",
                "nameGap": "25",
            },
        ],
        "yAxis": [
            {"type": "value", "gridIndex": 0},
            {
                "type": "value",
                "gridIndex": 1,
                "name": "No. Samples",
                "nameLocation": "center",
                "nameGap": "45",
            },
            {"type": "value", "gridIndex": 2},
        ],
        "series": [
            {
                "name": "Substitutions",
                "type": "bar",
                "symbol": "none",
                "itemStyle": {"color": "#6d81ad", "borderRadius": 2},
                "data": c_substitution,
                "xAxisIndex": 0,
                "yAxisIndex": 0,
            },
            {
                "name": "Insertions",
                "type": "bar",
                "symbol": "none",
                "itemStyle": {"color": "#39c093", "borderRadius": 2},
                "data": c_insertions,
                "xAxisIndex": 1,
                "yAxisIndex": 1,
            },
            {
                "name": "Deletions",
                "type": "bar",
                "symbol": "none",
                "itemStyle": {"color": "#fe4848", "borderRadius": 2},
                "data": c_deletions,
                "xAxisIndex": 2,
                "yAxisIndex": 2,
            },
        ],
    }


def _construct_samples_correlation_bar():
    return {
        "title": [
            {
                "top": "0",
                "left": 0,
                "text": "Correlation Test",
                "textStyle": {"fontWeight": "lighter", "fontStyle": "oblique"},
            },
            {
                "top": "5%",
                "left": "center",
                "text": "P-value: N/A",
                "textStyle": {
                    "fontWeight": "bold",
                    "fontStyle": "normal",
                    "fontSize": 12,
                },
            },
        ],
        "grid": [
            {"top": "15%", "left": "30%", "height": "80%", "width": "70%"},
        ],
        "xAxis": [{"type": "category", "gridIndex": 0}],
        "yAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "min": -1,
                "max": 1,
                "splitNumber": 10,
                "splitLine": {"lineStyle": {"type": "dashed"}},
                "name": "Test Value",
                "nameLocation": "center",
                "nameGap": "40",
            }
        ],
        "series": [
            {
                "name": "Test",
                "type": "bar",
                "data": [0.0],
                "xAxisIndex": 0,
                "yAxisIndex": 0,
                "itemStyle": {"color": "#6d81ad", "borderRadius": 2},
            }
        ],
    }


def _construct_samples_clustering_scatter():
    return {
        "title": [
            {
                "top": "0",
                "left": 0,
                "text": "UMAP Clustering",
                "textStyle": {"fontWeight": "lighter", "fontStyle": "oblique"},
            },
        ],
        "grid": [
            {"top": "10%", "left": "8%", "height": "75%", "width": "89%"},
        ],
        "xAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "name": "UMAP 1",
                "nameLocation": "center",
                "nameGap": "45",
            }
        ],
        "yAxis": [
            {
                "type": "value",
                "gridIndex": 0,
                "name": "UMAP 2",
                "nameLocation": "center",
                "nameGap": "45",
            }
        ],
        "series": [
            {
                "name": "UMAP Clustering",
                "type": "scatter",
                "xAxisIndex": 0,
                "yAxisIndex": 0,
            }
        ],
    }


def _view_output_to_dict(out):
    # Remove MUSIAL view specific comment lines.
    records = list(filter(lambda line: line != "", _remove_ansi(out).split("\n")[4:]))
    columns = records[0].split("\t")
    string_content = "\n".join(
        list(filter(lambda line: line != "", _remove_ansi(out).split("\n")[4:]))
    )
    content_df = pd.read_csv(StringIO(string_content), sep="\t")
    records = content_df.to_dict(orient="records")
    return {"columns": columns, "records": records}


def _log(content: str):
    if not "LOG" in session:
        session["LOG"] = ""
    session["LOG"] += "> " + str(datetime.now()) + "<br/>" + content + "<br/>"
