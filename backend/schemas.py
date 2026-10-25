
from pydantic import BaseModel, Field

class PredictionRequest(BaseModel):
    total_withdrawals: float = Field(ge=0)
    total_deposits: float = Field(ge=0)
    holiday_flag: int
    special_event_flag: int



class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    username: str
    password: str