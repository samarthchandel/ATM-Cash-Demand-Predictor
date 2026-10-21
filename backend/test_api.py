from fastapi.testclient import TestClient

from main import app


client = TestClient(app)



# Test home endpoint


response = client.get("/")

print("Home status:", response.status_code)
print("Home response:", response.json())



# Test registration


register_payload = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpassword123"
}

response = client.post(
    "/register",
    json=register_payload
)

print("\nRegistration status:", response.status_code)
print("Registration response:", response.json())



# Test login


login_payload = {
    "username": "testuser",
    "password": "testpassword123"
}

response = client.post(
    "/login",
    json=login_payload
)

print("\nLogin status:", response.status_code)
print("Login response:", response.json())


# Get JWT token
login_data = response.json()
token = login_data["access_token"]



# Test protected prediction


headers = {
    "Authorization": f"Bearer {token}"
}

prediction_payload = {
    "total_withdrawals": 60000,
    "total_deposits": 12000,
    "holiday_flag": 0,
    "special_event_flag": 1
}

response = client.post(
    "/predict",
    json=prediction_payload,
    headers=headers
)

print("\nProtected prediction status:", response.status_code)
print("Protected prediction response:", response.json())

# Test prediction WITHOUT JWT


response = client.post(
    "/predict",
    json=prediction_payload
)

print("\nUnauthorized prediction status:", response.status_code)
print("Unauthorized prediction response:", response.json())