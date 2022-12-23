from flask import Flask

app = Flask(__name__)

from musialweb import musial_web_api
from musialweb import template_provision

if __name__ == "__main__":
    app.run()
