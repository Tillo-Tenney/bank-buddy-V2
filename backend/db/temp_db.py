import sqlite3
import os
import tempfile

def create_temp_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    conn = sqlite3.connect(path)
    return conn, path

def destroy_temp_db(path):
    if os.path.exists(path):
        os.remove(path)
