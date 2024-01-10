from setuptools import setup

setup(
    name="musialweb",
     version="1.2.0",
    packages=["musialweb"],
    include_package_data=True,
    install_requires=[
        "flask==2.3.3",
        "Flask-Session==0.5.0",
        "werkzeug==2.3.7",
        "python-dotenv==1.0.0",
        "biopython==1.81",
        "brotli==1.1.0",
        "pandas==2.0.3",
        "numpy==1.24.4",
        "scipy==1.10.1",
        "gunicorn==21.0.1",
        "scikit-learn==1.3.2",
    ],
)
