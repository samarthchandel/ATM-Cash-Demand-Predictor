from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
import joblib
import bcrypt
import pandas as pd
from datetime import datetime, timedelta
from jose import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException

from database import get_db_connection
from schemas import PredictionRequest, RegisterRequest, LoginRequest


security = HTTPBearer()

app = FastAPI(
    title="ATM Cash Demand Predictor",
    description="API for predicting next-day ATM cash demand",
    version="1.0.0"
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# JWT CONFIGURATION
# --------------------------------------------------

SECRET_KEY = "atm-cash-demand-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# --------------------------------------------------
# LOAD ML MODEL
# --------------------------------------------------

model = joblib.load("../models/atm_cash_demand_model.pkl")


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "ATM Cash Demand Predictor API is running"
    }


# --------------------------------------------------
# REGISTER
# --------------------------------------------------

@app.post("/register")
def register(request: RegisterRequest):

    connection = get_db_connection()
    cursor = connection.cursor()

    check_query = """
        SELECT id
        FROM users
        WHERE username = %s OR email = %s
    """

    cursor.execute(
        check_query,
        (request.username, request.email)
    )

    existing_user = cursor.fetchone()

    if existing_user:
        cursor.close()
        connection.close()

        return {
            "message": "Username or email already exists"
        }

    password_hash = bcrypt.hashpw(
        request.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    insert_query = """
        INSERT INTO users (
            username,
            email,
            password_hash
        )
        VALUES (%s, %s, %s)
    """

    cursor.execute(
        insert_query,
        (
            request.username,
            request.email,
            password_hash
        )
    )

    connection.commit()

    cursor.close()
    connection.close()

    return {
        "message": "User registered successfully"
    }


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@app.post("/login")
def login(request: LoginRequest):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT id, username, password_hash, is_admin
        FROM users
        WHERE username = %s
    """

    cursor.execute(query, (request.username,))
    user = cursor.fetchone()

    cursor.close()
    connection.close()

    if not user:
        return {
            "message": "Invalid username or password"
        }

    password_valid = bcrypt.checkpw(
        request.password.encode("utf-8"),
        user["password_hash"].encode("utf-8")
    )

    if not password_valid:
        return {
            "message": "Invalid username or password"
        }

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    token_data = {
        "sub": str(user["id"]),
        "username": user["username"],
        "is_admin": bool(user["is_admin"]),
        "exp": expire
    }

    access_token = jwt.encode(
        token_data,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_admin": bool(user["is_admin"])
    }


# --------------------------------------------------
# VERIFY JWT
# --------------------------------------------------

def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


# --------------------------------------------------
# VERIFY ADMIN
# --------------------------------------------------

def verify_admin(
    current_user: dict = Depends(verify_token)
):

    if not current_user.get("is_admin", False):

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


# --------------------------------------------------
# PREDICTION
# --------------------------------------------------

@app.post("/predict")
def predict(
    request: PredictionRequest,
    current_user: dict = Depends(verify_token)
):

    input_data = pd.DataFrame({
        "Total_Withdrawals": [
            request.total_withdrawals
        ],
        "Total_Deposits": [
            request.total_deposits
        ],
        "Holiday_Flag": [
            request.holiday_flag
        ],
        "Special_Event_Flag": [
            request.special_event_flag
        ]
    })

    # Make prediction
    prediction = model.predict(input_data)[0]
    prediction = round(float(prediction), 2)

    # Connect to MySQL
    connection = get_db_connection()
    cursor = connection.cursor()

    # Store prediction with user ID
    query = """
        INSERT INTO predictions (
            user_id,
            total_withdrawals,
            total_deposits,
            holiday_flag,
            special_event_flag,
            predicted_cash_demand
        )
        VALUES (%s, %s, %s, %s, %s, %s)
    """

    values = (
        current_user["sub"],
        request.total_withdrawals,
        request.total_deposits,
        request.holiday_flag,
        request.special_event_flag,
        prediction
    )

    cursor.execute(query, values)

    connection.commit()

    cursor.close()
    connection.close()

    return {
        "predicted_cash_demand": prediction
    }
# --------------------------------------------------
# PREDICTION HISTORY
# --------------------------------------------------

@app.get("/predictions/history")
def prediction_history(
    current_user: dict = Depends(verify_token)
):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT
            id,
            total_withdrawals,
            total_deposits,
            holiday_flag,
            special_event_flag,
            predicted_cash_demand
        FROM predictions
        WHERE user_id = %s
        ORDER BY id DESC
    """

    cursor.execute(
        query,
        (current_user["sub"],)
    )

    predictions = cursor.fetchall()

    cursor.close()
    connection.close()

    return {
        "predictions": predictions
    }

# ==================================================
# ADMIN ENDPOINTS
# ==================================================


# --------------------------------------------------
# ADMIN STATS
# --------------------------------------------------

@app.get("/admin/stats")
def admin_stats(
    current_user: dict = Depends(verify_admin)
):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    # Total users
    cursor.execute("""
        SELECT COUNT(*) AS total_users
        FROM users
    """)

    total_users = cursor.fetchone()["total_users"]

    # Total predictions
    cursor.execute("""
        SELECT COUNT(*) AS total_predictions
        FROM predictions
    """)

    total_predictions = cursor.fetchone()["total_predictions"]

    # Average predicted demand
    cursor.execute("""
        SELECT AVG(predicted_cash_demand) AS average_demand
        FROM predictions
    """)

    result = cursor.fetchone()

    average_demand = result["average_demand"]

    if average_demand is not None:
        average_demand = round(float(average_demand), 2)
    else:
        average_demand = 0

    # Admin count
    cursor.execute("""
        SELECT COUNT(*) AS total_admins
        FROM users
        WHERE is_admin = TRUE
    """)

    total_admins = cursor.fetchone()["total_admins"]

    cursor.close()
    connection.close()

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "average_predicted_demand": average_demand,
        "total_admins": total_admins
    }


# --------------------------------------------------
# ADMIN - USERS
# --------------------------------------------------

@app.get("/admin/users")
def admin_users(
    current_user: dict = Depends(verify_admin)
):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT
            id,
            username,
            email,
            is_admin
        FROM users
        ORDER BY id DESC
    """

    cursor.execute(query)

    users = cursor.fetchall()

    cursor.close()
    connection.close()

    return {
        "users": users
    }


# --------------------------------------------------
# ADMIN - ALL PREDICTIONS
# --------------------------------------------------

@app.get("/admin/predictions")
def admin_predictions(
    current_user: dict = Depends(verify_admin)
):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT
            p.id,
            p.user_id,
            u.username,
            p.total_withdrawals,
            p.total_deposits,
            p.holiday_flag,
            p.special_event_flag,
            p.predicted_cash_demand
        FROM predictions p
        LEFT JOIN users u
            ON p.user_id = u.id
        ORDER BY p.id DESC
    """

    cursor.execute(query)

    predictions = cursor.fetchall()

    cursor.close()
    connection.close()

    return {
        "predictions": predictions
    }   