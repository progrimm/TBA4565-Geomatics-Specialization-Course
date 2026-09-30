import os

import psycopg


def connect_database():
    settings = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": os.getenv("DB_NAME", "projection_lab"),
        "user": os.getenv("DB_USER", "projection_api"),
        "connect_timeout": 5,
    }
    password = os.getenv("DB_PASSWORD")
    if password:
        settings["password"] = password
    return psycopg.connect(**settings)