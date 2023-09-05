from musialweb import app
from musialweb.musial_web_api import API_CODES
from flask import render_template


@app.route("/")
def get_template_home():
    return render_template("home.html", api_parameters=API_CODES)


@app.route("/upload")
def get_template_upload():
    return render_template("upload.html", api_parameters=API_CODES)


@app.route("/results")
def get_template_results():
    return render_template("results.html", api_parameters=API_CODES)


@app.route("/legal")
def get_template_legal():
    return render_template("legal.html", api_parameters=API_CODES)


@app.route("/help")
def get_template_help():
    return render_template("help.html", api_parameters=API_CODES)
