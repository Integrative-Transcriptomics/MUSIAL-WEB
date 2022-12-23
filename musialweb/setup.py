from setuptools import setup

setup(
    name="musialweb",
    packages=["musialweb"],
    include_package_data=True,
    install_requires=[
        "flask",
        "python-dotenv",
        "Flask-Session",
        "numpy",
        "datetime",
        "numpy",
        "brotli",
        "gunicorn",
    ],
)
