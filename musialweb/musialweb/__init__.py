# MUSIAL (Webserver) | Simon Hackl - simon.hackl@uni-tuebingen.de | v1.2.0 | GPL-3.0 license | github.com/Integrative-Transcriptomics/MUSIAL-WEB

from flask import Flask

app = Flask(__name__)

from musialweb import api
from musialweb import templates

if __name__ == "__main__":
    app.run()
