from flask import Flask

app = Flask(__name__)

from musialweb import api
from musialweb import templates

if __name__ == "__main__":
    app.run()
