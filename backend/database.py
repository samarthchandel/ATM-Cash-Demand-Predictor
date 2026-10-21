import mysql.connector


def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="chandel2612",
        database="atm_cash_predictor"
    )