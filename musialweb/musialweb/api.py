# MUSIAL (Webserver) | Simon Hackl - simon.hackl@uni-tuebingen.de | v1.2.0 | GPL-3.0 license | github.com/Integrative-Transcriptomics/MUSIAL-WEB

from musialweb import app
from flask import request, session, send_file, render_template
from flask_session import Session
from datetime import timedelta, datetime
from operator import methodcaller
from dotenv import load_dotenv
from io import StringIO
from Bio import SeqIO
from types import SimpleNamespace
import json, zlib, os, subprocess, shutil, random, string, re, brotli, base64, copy, traceback, math
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
app.config["SESSION_FILE_DIR"] = PATH_PREFIX + "session/"
app.config["SESSION_FILE_THRESHOLD"] = 100000
app.config["SESSION_COOKIE_NAME"] = "musialweb"
app.config["SESSION_USE_SIGNER"] = True
app.config["SESSION_PERMANENT"] = True
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=7.0)
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # Limit content lengths to 100 MB.

""" Set constant session keys. """
SESSION_KEY_REFERENCE_SEQUENCE = "pARM5DeVY0"
SESSION_KEY_STATE = "NQHMTbuHNH"
SESSION_KEY_SAMPLES_DF = "XnNOwNJl0x"
SESSION_KEY_FEATURES_DF = "XCaskJgQDv"
SESSION_KEY_VARIANTS_DF = "Gycu5aRrVn"
SESSION_KEY_SAMPLES_CLUSTERING = "B0MdMXSLUr"
SESSION_KEY_LOG = "QL6MMUYVz5"

""" Set API parameters. """
API_PARAMETERS = {
    "REQUEST_SUCCESS": "0",  # Response return code for successful requests.
    "REQUEST_FAILURE": "1",  # Response return code for failed requests (due to server internal error).
    "SESSION_STATE_NONE": "2",  # Response code indicating no active session.
    "SESSION_STATE_ACTIVE": "0",  # Response code  indicating an active session.
    "SESSION_STATE_FAILURE": "1",  # Response code  indicating a failed session.
    "SESSION_RESULT": os.getenv("RESULT_KEY"),
    "URL": os.getenv("URL"),
}
API_NAMESPACE = SimpleNamespace(**API_PARAMETERS)
""" Set DEBUG to true in order to display log as console output. """
DEBUG = bool(int(os.getenv("DEBUG")))
""" Start session """
Session(app)

@app.route("/session/status", methods=["GET"])
def session_status():
    if not SESSION_KEY_STATE in session:
        return {"code": API_NAMESPACE.SESSION_STATE_NONE, "cause": "No session data available."}
    else:
        return {"code": session[SESSION_KEY_STATE], "cause": ""}

@app.route("/session/patch", methods=["PATCH"])
def session_patch():
    _log( request.url_root, "Transfer Data to Server.")
    # Clear any current session data.
    session.clear()
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()
    # Variables to store output of MUSIAL run.
    stdout = ""
    stderr = ""
    response_code = API_NAMESPACE.REQUEST_SUCCESS
    response_cause = ""
    try:
        # Generate directory to store data temporary in the local file system.
        os.makedirs(PATH_PREFIX + "tmp/" + unique_hex_key)
        # Inflate the request data and transform into python dictionary.
        inflated_request_data = zlib.decompress(request.data)
        json_string_request_data = inflated_request_data.decode("utf8")
        json_request_data = json.loads(json_string_request_data)
        # Write reference .fasta to local file and set path in run specification.
        session[SESSION_KEY_REFERENCE_SEQUENCE] = json_request_data["referenceSequenceFile"]
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
            response_code = API_NAMESPACE.REQUEST_FAILURE
            response_cause = "Backend Error (Cf. Error Log)"
            _log(request.url, "Backend Error: " + _remove_ansi(stdout).replace( "\n", "</br>" ) + "</br>" + _remove_ansi(stderr).replace("\n", "</br>"))
            session[SESSION_KEY_STATE] = API_NAMESPACE.SESSION_STATE_FAILURE
            if DEBUG:
                print("\033[41m ERROR \033[0m")
                print(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        # Else, parse and store output of MUSIAL.
        else:
            with open(
                PATH_PREFIX + "tmp/" + unique_hex_key + "/output.json", "r"
            ) as run_out_file:
                session[API_NAMESPACE.SESSION_RESULT] = json.load(run_out_file)
            session[SESSION_KEY_STATE] = API_NAMESPACE.SESSION_STATE_ACTIVE
        if not SESSION_KEY_SAMPLES_CLUSTERING in session:
            session[SESSION_KEY_SAMPLES_CLUSTERING] = {
                "proteoform": _run_sample_clustering("proteoform"),
                "allele": _run_sample_clustering("allele")
            }
    # If any error is thrown by the server, set response code to 1 (failed).
    except Exception as e:
        response_code = API_NAMESPACE.REQUEST_FAILURE
        response_cause = "API Error: " + repr(e)
        _log( request.url, response_cause + "\n" + traceback.format_exc( ).replace( "\n", "</br>" ) )
        session[SESSION_KEY_STATE] = API_NAMESPACE.SESSION_STATE_FAILURE
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            traceback.print_exc()
    finally:
        # Remove temporary files, store results and log in session and return response code.
        shutil.rmtree(PATH_PREFIX + "tmp/" + unique_hex_key)
        if DEBUG:
            print("\033[46m LOG \033[0m")
            print(_remove_ansi(stdout) + "\n" + _remove_ansi(stderr))
        return {"code": response_code, "cause": response_cause}

@app.route("/session/data", methods=["GET"])
def session_data():
    if not API_NAMESPACE.SESSION_RESULT in session:
        return {
            "code": API_NAMESPACE.REQUEST_FAILURE,
            "cause": "API Warning: No session data available."
        }
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()
    # Variables to store output of MUSIAL run.
    stdout = ""
    stderr = ""
    response = []
    response_code = API_NAMESPACE.REQUEST_SUCCESS
    response_cause = ""
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
                session_results.write(json.dumps(session[API_NAMESPACE.SESSION_RESULT]))

        # (i) Run MUSIAL on the specified data to view samples.
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
            
            # Add clustering information to sample dataframe.
            if session[SESSION_KEY_SAMPLES_CLUSTERING]["allele"] is not None :
                per_sample_clusters = { }
                for value in session[SESSION_KEY_SAMPLES_CLUSTERING]["allele"][ 0 ].values( ) :
                    for sample_name in value[ "samples" ] :
                        cluster_label = "unassigned" if value[ "cluster" ] == -1 else value[ "cluster" ]
                        per_sample_clusters[ sample_name ] = cluster_label
                sample_df_allele_cluster_column_data = [ ]
                for row in sample_df.iterrows( ) :
                    sample_name = row[1]["name"]
                    sample_df_allele_cluster_column_data.append( per_sample_clusters[ sample_name ] )
                sample_df[ "cluster_alleles" ] = sample_df_allele_cluster_column_data
                sample_records["columns"] += [ "cluster_alleles" ]
                for record in sample_records[ "records" ] :
                    record[ "cluster_alleles" ] = per_sample_clusters[ record[ "name" ] ]
            if session[SESSION_KEY_SAMPLES_CLUSTERING]["proteoform"] is not None :
                per_sample_clusters = { }
                for value in session[SESSION_KEY_SAMPLES_CLUSTERING]["proteoform"][ 0 ].values( ) :
                    for sample_name in value[ "samples" ] :
                        cluster_label = "unassigned" if value[ "cluster" ] == -1 else value[ "cluster" ]
                        per_sample_clusters[ sample_name ] = cluster_label
                sample_df_proteoform_cluster_column_data = [ ]
                for row in sample_df.iterrows( ) :
                    sample_name = row[1]["name"]
                    sample_df_proteoform_cluster_column_data.append( per_sample_clusters[ sample_name ] )
                sample_df[ "cluster_proteoforms" ] = sample_df_proteoform_cluster_column_data
                sample_records["columns"] += [ "cluster_proteoforms" ]
                for record in sample_records[ "records" ] :
                    record[ "cluster_proteoforms" ] = per_sample_clusters[ record[ "name" ] ]
            session[SESSION_KEY_SAMPLES_DF] = sample_df
            if stderr != "":
                response_code = API_NAMESPACE.REQUEST_FAILURE
                response_cause = "Backend Error (Cf. Error Log)"
                _log(request.url, "Backend Error: " + _remove_ansi(stdout).replace( "\n", "</br>" ) + "</br>" + _remove_ansi(stderr).replace("\n", "</br>"))
        else:
            sample_df, sample_records = _view_samples_output_to_dict(None)
        # Add counts per category in dataframe to samples dataframe.
        counts = {}
        for column in sample_df:
            if column != "name":
                counts[column] = sample_df.groupby(column)["name"].count().to_dict()
        sample_records[ "counts" ] = counts
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
                response_code = API_NAMESPACE.REQUEST_FAILURE
                response_cause = "Backend Error (Cf. Error Log)"
                _log(request.url, "Backend Error: " + _remove_ansi(stdout).replace( "\n", "</br>" ) + "</br>" + _remove_ansi(stderr).replace("\n", "</br>"))
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
                response_code = API_NAMESPACE.REQUEST_FAILURE
                response_cause = "Backend Error (Cf. Error Log)"
                _log(request.url, "Backend Error: " + _remove_ansi(stdout).replace( "\n", "</br>" ) + "</br>" + _remove_ansi(stderr).replace("\n", "</br>"))
        else:
            _, variants_records = _view_variants_output_to_dict(None)
        response.append(variants_records)
    # If any error is thrown by the server, set response code to 1 (failed).
    except Exception as e:
        response_code = API_NAMESPACE.REQUEST_FAILURE
        response_cause = "API Error: " + repr(e)
        _log( request.url, response_cause + "\n" + traceback.format_exc( ).replace( "\n", "</br>" ) )
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            traceback.print_exc()
    finally:
        # Remove temporary files, store results and log in session and return response code.
        if os.path.isdir(PATH_PREFIX + "tmp/" + unique_hex_key):
            shutil.rmtree(PATH_PREFIX + "tmp/" + unique_hex_key)
        return {
            "code": response_code,
            "cause": response_cause,
            "content": json.dumps(response).replace("NaN", "null"),
        }

@app.route("/session/log", methods=["GET"])
def session_log():
    format_log_entry = lambda e :  e[0] + '<div style="padding: 5px; margin-top: 5px; margin-bottom: 5px; border-radius: 2px; background-color: #cbd0e0; width: 50%;">' + e[1] + '</div>'
    content = "<div style='padding: 5px; font-family: monospace;'>"
    content += "<h3 style='color: #747474'>MUSIAL (Web v1.2.0) Session Log <small>[" + str(datetime.now()) + "]</small></h3>"
    if SESSION_KEY_LOG in session :
        content += '<ul>'
        for log_entry in session[SESSION_KEY_LOG] :
            content += '<li>' + format_log_entry(log_entry) + '</li>'
        content += '</ul>'
    else :
        content += "<h4 style='color: #747474'>There is no log information for the session.</h4>"
    content += "</div>"
    return content

@app.route("/example/data", methods=["GET"])
def example_data():
    _log( request.url_root, "Request Example Data." )
    return send_file(
        PATH_PREFIX + "static/resources/example_data.zip", as_attachment=True
    )

@app.route("/example/session", methods=["GET"])
def example_session():
    _log( request.url_root, "Request Example Session." )
    # Clear any current session data.
    session.clear()
    # Variables to store output of MUSIAL run.
    result = ""
    response_code = API_NAMESPACE.REQUEST_SUCCESS
    response_cause = ""
    try:
        # Load static example session.
        with open(
            PATH_PREFIX + "static/resources/example_session.json", "r"
        ) as example_session_file:
            result = json.load(example_session_file)
    # If any error is thrown by the server, set response code to failed.
    except Exception as e:
        response_code = API_NAMESPACE.REQUEST_FAILURE
        response_cause = "API Error: " + repr(e)
        _log( request.url, response_cause + "\n" + traceback.format_exc( ).replace( "\n", "</br>" ) )
        session[SESSION_KEY_STATE] = API_NAMESPACE.SESSION_STATE_FAILURE
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            traceback.print_exc()
    finally:
        session[API_NAMESPACE.SESSION_RESULT] = result
        with open( PATH_PREFIX + "static/resources/example_reference.fasta", "r" ) as reference :
            session[SESSION_KEY_REFERENCE_SEQUENCE] = reference.read( )
        if not SESSION_KEY_SAMPLES_CLUSTERING in session:
            session[SESSION_KEY_SAMPLES_CLUSTERING] = {
                "proteoform": _run_sample_clustering("proteoform"),
                "allele": _run_sample_clustering("allele")
            }
        
        session[SESSION_KEY_STATE] = API_NAMESPACE.SESSION_STATE_ACTIVE
        return {"code": response_code, "cause": response_cause}

@app.route("/download_session", methods=["GET"])
def download_session():
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()
    response_code = API_NAMESPACE.REQUEST_SUCCESS
    try:
        # Generate directory to store data temporary in the local file system.
        os.mkdir(PATH_PREFIX + "tmp/" + unique_hex_key)
        with open(
            PATH_PREFIX + "tmp/" + unique_hex_key + "/storage.json.br", "wb+"
        ) as compressed_result:
            # Write compressed session result.
            compressed_result.write(
                brotli.compress(
                    json.dumps(session[API_NAMESPACE.SESSION_RESULT]).encode("utf-8")
                )
            )
            return send_file(
                PATH_PREFIX + "tmp/" + unique_hex_key + "/storage.json.br",
                as_attachment=True,
            )
    except Exception as e:
        response_code = API_NAMESPACE.REQUEST_FAILURE
        response_cause = "API Error: " + repr(e)
        _log( request.url, response_cause + "\n" + traceback.format_exc( ).replace( "\n", "</br>" ) )
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            traceback.print_exc()
        return {"code": response_code, "cause": response_cause}
    finally:
       shutil.rmtree(PATH_PREFIX + "tmp/" + unique_hex_key)

@app.route("/download_sequences", methods=["POST"])
def download_sequences():
    response_code = API_NAMESPACE.REQUEST_SUCCESS
    response_cause = ""
    # Inflate the request data and transform into python dictionary.
    inflated_request_data = zlib.decompress(request.data)
    json_string_request_data = inflated_request_data.decode("utf8")
    json_request_data = json.loads(json_string_request_data)
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()    
    try:
        # Generate directory to store data temporary in the local file system.
        os.mkdir(PATH_PREFIX + "tmp/" + unique_hex_key)
        with open( PATH_PREFIX + "tmp/" + unique_hex_key + "/results.json", "w+" ) as session_results:
            session_results.write(json.dumps(session[API_NAMESPACE.SESSION_RESULT]))
        if json_request_data[ "content" ] == "nucleotide" and json_request_data[ "conserved" ] :
            with open( PATH_PREFIX + "tmp/" + unique_hex_key + "/reference.fasta", "w+" ) as nucleotide_reference:
                nucleotide_reference.write(session[SESSION_KEY_REFERENCE_SEQUENCE])
        process = subprocess.Popen(
            [
                os.getenv("JAVA_PATH"),
                "-Xms4G",
                "-Xmx8G",
                "-jar",
                PATH_PREFIX + "MUSIAL-v2.2.jar",
                "export_sequence",
                "-a" if json_request_data[ "align" ] else "",
                "-c",
                json_request_data[ "content" ],
                "-F",
                json_request_data[ "feature" ],
                "-g" if json_request_data[ "merge" ] else "",
                "-I",
                PATH_PREFIX + "tmp/" + unique_hex_key + "/results.json",
                "-k" if json_request_data[ "conserved" ] else "",
                "-O",
                PATH_PREFIX + "tmp/" + unique_hex_key + "/" + json_request_data[ "feature" ] + "_sequences.fasta",
                "-r" if ( json_request_data[ "conserved" ] and json_request_data[ "content" ] == "nucleotide" ) else "",
                PATH_PREFIX + "tmp/" + unique_hex_key + "/reference.fasta" if ( json_request_data[ "conserved" ] and json_request_data[ "content" ] == "nucleotide" ) else "",
                "-s",
                *json_request_data[ "samples" ]
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = process.communicate()
        stdout = stdout.decode(encoding="utf-8")
        stderr = stderr.decode(encoding="utf-8")
        if stderr != "":
            response_code = API_NAMESPACE.REQUEST_FAILURE
            response_cause = "Backend Error (Cf. Error Log)"
            _log(request.url, "Backend Error: " + _remove_ansi(stdout).replace( "\n", "</br>" ) + "</br>" + _remove_ansi(stderr).replace("\n", "</br>"))
            return {"code": response_code, "cause": response_cause}
        else :
            return send_file(
                PATH_PREFIX + "tmp/" + unique_hex_key + "/" + json_request_data[ "feature" ] + "_sequences.fasta",
                as_attachment=True,
            )
    except Exception as e:
        response_code = API_NAMESPACE.REQUEST_FAILURE
        response_cause = "API Error: " + repr(e)
        _log( request.url, response_cause + "\n" + traceback.format_exc( ).replace( "\n", "</br>" ) )
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            traceback.print_exc()
        return { "code": response_code, "cause": response_cause }
    finally:
       shutil.rmtree(PATH_PREFIX + "tmp/" + unique_hex_key)

@app.route("/download_table", methods=["POST"])
def download_table():
    response_code = API_NAMESPACE.REQUEST_SUCCESS
    # Inflate the request data and transform into python dictionary.
    inflated_request_data = zlib.decompress(request.data)
    json_string_request_data = inflated_request_data.decode("utf8")
    json_request_data = json.loads(json_string_request_data)
    # Generate unique hex string to use as directory name in the local file system.
    unique_hex_key = _generate_random_string()    
    try:
        # Generate directory to store data temporary in the local file system.
        os.mkdir(PATH_PREFIX + "tmp/" + unique_hex_key)
        with open( PATH_PREFIX + "tmp/" + unique_hex_key + "/results.json", "w+" ) as session_results:
            session_results.write(json.dumps(session[API_NAMESPACE.SESSION_RESULT]))
        if json_request_data[ "content" ] == "nucleotide" and json_request_data[ "conserved" ] :
            with open( PATH_PREFIX + "tmp/" + unique_hex_key + "/reference.fasta", "w+" ) as nucleotide_reference:
                nucleotide_reference.write(session[SESSION_KEY_REFERENCE_SEQUENCE])
        process = subprocess.Popen(
            [
                os.getenv("JAVA_PATH"),
                "-Xms4G",
                "-Xmx8G",
                "-jar",
                PATH_PREFIX + "MUSIAL-v2.2.jar",
                "export_table",
                "-c",
                json_request_data[ "content" ],
                "-F",
                json_request_data[ "feature" ],
                "-g" if json_request_data[ "merge" ] else "",
                "-I",
                PATH_PREFIX + "tmp/" + unique_hex_key + "/results.json",
                "-k" if json_request_data[ "conserved" ] else "",
                "-O",
                PATH_PREFIX + "tmp/" + unique_hex_key + "/" + json_request_data[ "feature" ] + "_variants.tsv",
                "-r" if ( json_request_data[ "conserved" ] and json_request_data[ "content" ] == "nucleotide" ) else "",
                PATH_PREFIX + "tmp/" + unique_hex_key + "/reference.fasta" if ( json_request_data[ "conserved" ] and json_request_data[ "content" ] == "nucleotide" ) else "",
                "-s",
                *json_request_data[ "samples" ]
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = process.communicate()
        stdout = stdout.decode(encoding="utf-8")
        stderr = stderr.decode(encoding="utf-8")
        if stderr != "":
            response_code = API_NAMESPACE.REQUEST_FAILURE
            response_cause = "Backend Error (Cf. Error Log)"
            _log(request.url, "Backend Error: " + _remove_ansi(stdout).replace( "\n", "</br>" ) + "</br>" + _remove_ansi(stderr).replace("\n", "</br>"))
            return {"code": response_code, "cause": response_cause}
        else :
            return send_file(
                PATH_PREFIX + "tmp/" + unique_hex_key + "/" + json_request_data[ "feature" ] + "_variants.tsv",
                as_attachment=True,
            )
    except Exception as e:
        response_code = API_NAMESPACE.REQUEST_FAILURE
        response_cause = "API Error: " + repr(e)
        _log( request.url, response_cause + "\n" + traceback.format_exc( ).replace( "\n", "</br>" ) )
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            traceback.print_exc()
        return {"code": response_code, "cause": response_cause}
    finally:
       shutil.rmtree(PATH_PREFIX + "tmp/" + unique_hex_key)

@app.route("/calc/correlation", methods=["POST"])
def clc_correlation():
    response_code = API_NAMESPACE.REQUEST_SUCCESS
    response_cause = ""
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
        elif test == "spearmanr":
            n = "Spearman"
            t, p = sc.stats.spearmanr(df[key1].to_numpy(), df[key2].to_numpy())
        elif test == "kendalltau":
            n = "Kendall's Tau"
            t, p = sc.stats.kendalltau(df[key1].to_numpy(), df[key2].to_numpy())
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
            p = None
        else:
            response_code = API_NAMESPACE.REQUEST_FAILURE
            response_cause = "API Warning: Specified test " + test + " not implemented."
            n = "Not implemented"
            t = None
            p = None
    except Exception as e:
        response_code = API_NAMESPACE.REQUEST_FAILURE
        response_cause = "API Error: " + repr(e)
        _log( request.url, response_cause + "\n" + traceback.format_exc( ).replace( "\n", "</br>" ) )
        t = None
        p = None
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            traceback.print_exc()
    return {
        "code": response_code,
        "cause": response_cause,
        "t": format(t, ".6g"),
        "p": format(p, ".6g"),
        "name": n
    }

@app.route("/calc/forms_graph", methods=["POST"])
def clc_feature_graph():
    def node_annotations(x):
        annotations = copy.deepcopy(x)
        if "variants" in annotations and annotations["variants"] != "":
            annotations["variants"] = _brotli_decompress(annotations["variants"])
        return annotations

    def node_size(x):
        f = (x / len(storage["samples"].keys())) * 100
        return round(10 / (1 + 2 * (math.exp(-0.05)) ** f), 1)
    
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
        return len(x.difference(y)) + len(y.difference(x))
    
    def graph_topology(forms, prefix) -> list:
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
            min_distance = np.inf
            parents = [ ]
            distances = { }
            for j in forms_variants_keys :
                if len( forms_variants[j] ) < len( forms_variants[ i ] ) :
                    distance_ij = distance(forms_variants[i], forms_variants[j])
                    distances[ j ] = distance_ij
                    if distance_ij < min_distance :
                        min_distance = distance_ij
            for j in distances.keys( ) :
                if distances[ j ] == min_distance :
                    parents.append( j )
            if len( parents ) > 0 :
                for _ in range( len( parents ) ) :
                    parent = parents[ _ ]
                    links.append({
                        "source": prefix + parent,
                        "target": prefix + i,
                        "value": distances[ parent ],
                        "lineStyle": {
                            "type": "solid",
                            "color": "#607196" if _ == 0 else "#9ba6bd",
                            "width": 1.2 if _ == 0 else 0.6,
                            "curveness": 0.2,
                        },
                        "type": "relation",
                        "ignoreForceLayout": _ != 0
                    })
        return links
    
    response_code = API_NAMESPACE.REQUEST_SUCCESS
    response_cause = ""

    symbol_proteoform = "path://M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM184 128h92c50.8 0 92 41.2 92 92s-41.2 92-92 92H208v48c0 13.3-10.7 24-24 24s-24-10.7-24-24V288 152c0-13.3 10.7-24 24-24zm92 136c24.3 0 44-19.7 44-44s-19.7-44-44-44H208v88h68z"
    symbol_allele = "path://M256,512A256,256,0,1,0,256,0a256,256,0,1,0,0,512zm0-400c9.1,0,17.4,5.1,21.5,13.3l104,208c5.9,11.9,1.1,26.3-10.7,32.2s-26.3,1.1-32.2-10.7L321.2,320H190.8l-17.4,34.7c-5.9,11.9-20.3,16.7-32.2,10.7s-16.7-20.3-10.7-32.2l104-208c4.1-8.1,12.4-13.3,21.5-13.3zm0,77.7L214.8,272h82.3L256,189.7z"

    # Inflate the request data and transform into python dictionary.
    inflated_request_data = zlib.decompress(request.data)
    json_string_request_data = inflated_request_data.decode("utf8")
    json_request_data = json.loads(json_string_request_data)
    storage = session[API_NAMESPACE.SESSION_RESULT]
    feature = json_request_data["feature"]
    nodes = []
    links = []
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
                            "source": "Allele " + allele_name,
                            "target": "Proteoform " + proteoform["name"],
                            "share": allele_weight,
                            "value": 0,
                            "lineStyle": {
                                "type": "dotted",
                                "color": "#cbd0e0",
                                "width": 2,
                                "curveness": 0.0,
                            },
                            "type": "interconnection"
                        }
                    )
                proteoform_node["symbolSize"] = node_size(proteoform_weight)
                nodes.append(proteoform_node)
            links += graph_topology(storage["features"][feature]["proteoforms"].values(), "Proteoform ")
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
                    "symbolSize": node_size(allele_weight),
                }
                nodes.append(allele_node)
            links += graph_topology(storage["features"][feature]["alleles"].values(), "Allele ")
    except Exception as e:
        nodes = []
        links = []
        response_code = API_NAMESPACE.REQUEST_FAILURE
        response_cause = "API Error: " + repr(e)
        _log( request.url, response_cause + "</br>" + traceback.format_exc( ).replace( "\n", "</br>" ) )
        if DEBUG:
            print("\033[41m ERROR \033[0m")
            traceback.print_exc()
    return {
        "code": response_code,
        "cause": response_cause,
        "nodes": nodes,
        "links": links
    }

@app.route("/ext/proteoforms_dashboard", methods=["GET"])
def ext_proteoformsDashboard():
    target = request.args.get("target")
    if (
        API_NAMESPACE.SESSION_RESULT in session
        and target in session[API_NAMESPACE.SESSION_RESULT]["features"]
        and session[API_NAMESPACE.SESSION_RESULT]["features"][target]["type"] == "coding"
    ):
        # Decode PDB format structure into raw string, if it exists.
        target_data = copy.deepcopy(
            session[API_NAMESPACE.SESSION_RESULT]["features"][target]
        )
        target_data["samples"] = copy.deepcopy(
            session[API_NAMESPACE.SESSION_RESULT]["samples"]
        )
        if "structure" in target_data:
            target_data["structure"] = _brotli_decompress(target_data["structure"])
        return render_template(
            "ext_proteoformsDashboard.html",
            data=target_data,
            target=target,
        )
    else :
        return render_template(
            "ext_proteoformsDashboard.html",
            data=None,
            target=target,
        )

@app.route("/log_interaction", methods=["PUT"])
def log_interaction():
    # Parse request data.
    inflated_request_data = zlib.decompress(request.data)
    json_string_request_data = inflated_request_data.decode("utf8")
    json_request_data = json.loads(json_string_request_data)
    _log( "User Interaction", json_request_data[ "content" ] )
    return { "code": API_NAMESPACE.REQUEST_SUCCESS }

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
    records = content_df.to_dict(orient="records")
    return content_df, {
        "columns": columns,
        "records": records,
        "dashboard": {
            "overview_area": mwchart.samples_overview_bar(),
            "clustering_allele": mwchart.samples_clustering_scatter(
                *session[SESSION_KEY_SAMPLES_CLUSTERING]["allele"]
            ) if session[SESSION_KEY_SAMPLES_CLUSTERING]["allele"] is not None else {
                "title": {
                    "top": 0,
                    "left": 20,
                    "text": "tSNE Embedding",
                    "subtext": "No data on allele clustering available.",
                    "textStyle": {"fontWeight": "lighter"},
                },
            },
            "clustering_proteoform": mwchart.samples_clustering_scatter(
                *session[SESSION_KEY_SAMPLES_CLUSTERING]["proteoform"]
            ) if session[SESSION_KEY_SAMPLES_CLUSTERING]["proteoform"] is not None else {
                "title": {
                    "top": 0,
                    "left": 20,
                    "text": "tSNE Embedding",
                    "subtext": "No data on proteoform clustering available.",
                    "textStyle": {"fontWeight": "lighter"},
                },
            },
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
                session[API_NAMESPACE.SESSION_RESULT]["referenceLength"],
                # FIXME: Will cause a bug, if entry does not exist!
                session[SESSION_KEY_FEATURES_DF],
            ),
        },
    }

def _run_sample_clustering(form_type):
    # Collect variants from sequence alignment per feature.
    storage = session[API_NAMESPACE.SESSION_RESULT]
    unique_hex_key = _generate_random_string()
    data = {
        "features": { },
        "samples": { }
    }
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
            if content_type == "aminoacid" and storage["features"][feature_name]["type"] != "coding":
                continue
            if not feature_name in data[ "features" ] :
                data[ "features" ][ feature_name ] = { }
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
                    "-g",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            stdout, stderr = process.communicate()
            stdout = stdout.decode()
            stderr = stderr.decode()
            if stderr != "":
                return None
            else:
                for sequence_record in SeqIO.parse(
                    PATH_PREFIX
                    + "tmp/"
                    + unique_hex_key
                    + "/sequences_"
                    + feature_name
                    + ".fasta",
                    "fasta",
                ) :
                    sequence = list(str(sequence_record.seq))
                    data[ "features" ][ feature_name ][ str(sequence_record.id) ] = { "variants": [ str( i ) + sequence[ i ] for i in range( len( sequence ) ) ] }
            for sample_name in storage["samples"].keys() :
                if not sample_name in data["samples"] :
                    data["samples"][sample_name] = { }
                data["samples"][sample_name][ feature_name ] = storage["samples"][ sample_name ][ "annotations" ][ form_type + "_" + feature_name ]
    finally:
        shutil.rmtree(PATH_PREFIX + "tmp/" + unique_hex_key)
    if len( data["features"].keys() ) == 0 :
        return None
    else :
        # Cluster samples with HDBSCAN and run tSNE embedding for visualization.
        return mwclustering.compute_clusters(data)

def _generate_random_string():
    return "".join(
        random.SystemRandom().choice(string.ascii_letters + string.digits)
        for _ in range(10)
    )

def _remove_ansi(text):
    ansi_remove_expression = re.compile(r"(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]")
    return ansi_remove_expression.sub("", text)

def _log(url: str, content: str):
    if not SESSION_KEY_LOG in session:
        session[SESSION_KEY_LOG] = [ ]
    session[SESSION_KEY_LOG].append(( url + ' <small>[' + str(datetime.now()) + ']</small>', content ))
    
def _brotli_decompress(content: str):
    return brotli.decompress(base64.standard_b64decode(content)).decode()
