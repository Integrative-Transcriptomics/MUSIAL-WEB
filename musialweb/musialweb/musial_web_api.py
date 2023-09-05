from musialweb import app
from flask import request, session, render_template, send_file
from flask_session import Session
from datetime import timedelta, datetime
from operator import methodcaller
from dotenv import load_dotenv
from io import StringIO
import json, zlib, os, subprocess, shutil, numpy, brotli, random, string, re
import pandas as pd

""" Load variables from local file system. """
load_dotenv()

""" Set session configuration parameters. """
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_KEY_PREFIX"] = "musial:"
app.config["SESSION_COOKIE_NAME"] = "musial_session"
app.config["SESSION_FILE_DIR"] = "./musialweb/session/"
app.config["SESSION_USE_SIGNER"] = True
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=5.0)
app.config["SESSION_FILE_THRESHOLD"] = 15000
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024  # Limit content lengths to 1 GB.
""" Set constant session keys. """
SESSION_KEY_REFERENCE_SEQUENCE = "U0VTU0lPTl9LRVlfUkVGRVJFTkNFX1NFUVVFTkNF"
SESSION_SATUS_KEY = "U0VTU0lPTl9TQVRVU19LRVk"
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


@app.route("/session_status", methods=["GET"])
def session_status():
    """
    GET route to check whether an active session exists.
    """
    if not SESSION_SATUS_KEY in session:
        return API_CODES["SESSION_CODE_NONE"]
    else:
        return session[SESSION_SATUS_KEY]


@app.route("/session_start", methods=["POST"])
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
        os.makedirs("./musialweb/tmp/" + unique_hex_key)
        # Inflate the request data and transform into python dictionary.
        inflated_request_data = zlib.decompress(request.data)
        json_string_request_data = inflated_request_data.decode("utf8")
        json_request_data = json.loads(json_string_request_data)
        # Write reference .fasta to local file and set path in run specification.
        with open(
            "./musialweb/tmp/" + unique_hex_key + "/reference.fasta", "w+"
        ) as reference_fasta_file:
            reference_fasta_file.write(json_request_data["referenceSequenceFile"])
            json_request_data["referenceSequenceFile"] = (
                "./musialweb/tmp/" + unique_hex_key + "/reference.fasta"
            )
        # Write reference .gff3 to local file and set path in run specification.
        with open(
            "./musialweb/tmp/" + unique_hex_key + "/reference.gff3", "w+"
        ) as reference_gff3_file:
            reference_gff3_file.write(json_request_data["referenceFeaturesFile"])
            json_request_data["referenceFeaturesFile"] = (
                "./musialweb/tmp/" + unique_hex_key + "/reference.gff3"
            )
        # For each specified feature, write .pdb to local file and set path in run specification, if provided.
        for feature in json_request_data["features"].keys():
            if "pdbFile" in json_request_data["features"][feature]:
                with open(
                    "./musialweb/tmp/" + unique_hex_key + "/" + feature + ".pdb", "w+"
                ) as feature_pdb_file:
                    feature_pdb_file.write(
                        json_request_data["features"][feature]["pdbFile"]
                    )
                    json_request_data["features"][feature]["pdbFile"] = (
                        "./musialweb/tmp/" + unique_hex_key + "/" + feature + ".pdb"
                    )
        # For each specified sample, write .vcf to local file and set path in run specification.
        for sample in json_request_data["samples"].keys():
            with open(
                "./musialweb/tmp/" + unique_hex_key + "/" + sample + ".vcf", "w+"
            ) as sample_vcf_file:
                sample_vcf_file.write(json_request_data["samples"][sample]["vcfFile"])
                json_request_data["samples"][sample]["vcfFile"] = (
                    "./musialweb/tmp/" + unique_hex_key + "/" + sample + ".vcf"
                )
        # Write the adjusted request (i.e. used as MUSIAL build configuration) to local file.
        with open(
            "./musialweb/tmp/" + unique_hex_key + "/configuration.json", "w+"
        ) as build_configuration_file:
            json_request_data["output"] = (
                "./musialweb/tmp/" + unique_hex_key + "/output.json"
            )
            json.dump(json_request_data, build_configuration_file)
        # Run MUSIAL on the specified data.
        process = subprocess.Popen(
            [
                os.getenv("JAVA_PATH"),
                "-jar",
                "./musialweb/MUSIAL-v2.2.jar",
                "build",
                "-c",
                "./musialweb/tmp/" + unique_hex_key + "/configuration.json",
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
            session[SESSION_SATUS_KEY] = API_CODES["SESSION_CODE_FAILED"]
            _log(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
            if DEBUG:
                print("\033[41m ERROR \033[0m")
                print(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        # Else, parse and store output of MUSIAL.
        else:
            with open(
                "./musialweb/tmp/" + unique_hex_key + "/output.json", "r"
            ) as run_out_file:
                json_result_data = json.load(run_out_file)
                result = json_result_data
    # If any error is thrown by the server, set response code to 1 (failed).
    except Exception as e:
        response_code = API_CODES["FAILURE_CODE"]
        session[SESSION_SATUS_KEY] = API_CODES["SESSION_CODE_FAILED"]
        _log(_remove_ansi(str(e)))
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(_remove_ansi(str(e)))
    finally:
        # Remove temporary files, store results and log in session and return response code.
        shutil.rmtree("./musialweb/tmp/" + unique_hex_key)
        session[API_CODES["RESULT_KEY"]] = result
        session[SESSION_SATUS_KEY] = API_CODES["SESSION_CODE_ACTIVE"]
        _log(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        if DEBUG:
            print("\033[46m LOG \033[0m")
            print(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        return response_code


@app.route("/log", methods=["GET"])
def log():
    if "LOG" in session:
        return session["LOG"]
    else:
        return API_CODES["FAILURE_CODE"]


@app.route("/session_data", methods=["GET"])
def session_data():
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()
    # Variables to store output of MUSIAL run.
    stdout = ""
    stderr = ""
    response = []
    try:
        # Generate directory to store data temporary in the local file system.
        os.makedirs("./musialweb/tmp/" + unique_hex_key)
        with open(
            "./musialweb/tmp/" + unique_hex_key + "/results.json", "w+"
        ) as session_results:
            session_results.write(json.dumps(session[API_CODES["RESULT_KEY"]]))

        # (i) Run MUSIAL on the specified data to view samples.
        process = subprocess.Popen(
            [
                os.getenv("JAVA_PATH"),
                "-jar",
                "./musialweb/MUSIAL-v2.2.jar",
                "view_samples",
                "-I",
                "./musialweb/tmp/" + unique_hex_key + "/results.json",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = process.communicate()
        stdout = stdout.decode()
        stderr = stderr.decode()
        response.append(_view_output_to_dict(stdout))
        if stderr != "":
            _log("Error when retrieving sample data; " + _remove_ansi(stderr))

        # (ii) Run MUSIAL on the specified data to view features.
        process = subprocess.Popen(
            [
                os.getenv("JAVA_PATH"),
                "-jar",
                "./musialweb/MUSIAL-v2.2.jar",
                "view_features",
                "-I",
                "./musialweb/tmp/" + unique_hex_key + "/results.json",
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
                "./musialweb/MUSIAL-v2.2.jar",
                "view_variants",
                "-I",
                "./musialweb/tmp/" + unique_hex_key + "/results.json",
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
        shutil.rmtree("./musialweb/tmp/" + unique_hex_key)
        _log("Retrieved session data.")
        return response


@app.route("/example_data", methods=["GET"])
def example_data():
    return send_file("./static/resources/example_data.zip", as_attachment=True)


@app.route("/example_session", methods=["GET"])
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
            "./musialweb/static/resources/example_session.json", "r"
        ) as example_session_file:
            result = json.load(example_session_file)
    # If any error is thrown by the server, set response code to failed.
    except Exception as e:
        response_code = API_CODES["FAILURE_CODE"]
        session[SESSION_SATUS_KEY] = API_CODES["SESSION_CODE_FAILED"]
        _log(_remove_ansi(str(e)))
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            print(str(e))
    finally:
        session[API_CODES["RESULT_KEY"]] = result
        session[SESSION_SATUS_KEY] = API_CODES["SESSION_CODE_ACTIVE"]
        _log("Example session initialized.")
        return response_code


@app.route("/download_session_storage", methods=["GET"])
def download_session_storage():
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()
    response_code = API_CODES["SUCCESS_CODE"]
    try:
        # Generate directory to store data temporary in the local file system.
        os.mkdir("./musialweb/tmp/" + unique_hex_key)
        with open(
            "./musialweb/tmp/" + unique_hex_key + "/storage.json.br", "wb+"
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
    #    shutil.rmtree("./musialweb/tmp/" + unique_hex_key)


def _generate_random_string():
    return "".join(
        random.SystemRandom().choice(string.ascii_letters + string.digits)
        for _ in range(10)
    )


def _remove_ansi(text):
    ansi_remove_expression = re.compile(r"(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]")
    return ansi_remove_expression.sub("", text)


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
