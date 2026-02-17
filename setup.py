from setuptools import setup, find_packages

setup(
    name="mr-dollars",
    version="0.1.0",
    description="Mr. Dollars — Financial Intelligence Assistant for Barber Operations",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "fastapi>=0.109.0",
        "uvicorn[standard]>=0.27.0",
        "httpx>=0.26.0",
        "pydantic>=2.5.0",
        "websockets>=12.0",
        "jinja2>=3.1.3",
        "python-dateutil>=2.8.2",
    ],
    entry_points={
        "console_scripts": [
            "mr-dollars=main:main",
        ],
    },
)
