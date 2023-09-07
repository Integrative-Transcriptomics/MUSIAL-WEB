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
        "scipy",
        "datetime",
        "numpy",
        "brotli",
        "zlib",
        "gunicorn",
        "pandas",
        "matplotlib",
        "umap-learn",
    ],
)
