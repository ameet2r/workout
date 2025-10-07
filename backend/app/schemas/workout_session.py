from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class SetData(BaseModel):
    reps: int = Field(..., ge=0, le=1000)
    weight: Optional[float] = Field(None, ge=0, le=10000)
    completed_at: datetime
    rpe: Optional[int] = Field(None, ge=1, le=10)  # Rate of Perceived Exertion (1-10)
    notes: Optional[str] = Field(None, max_length=500)


class SessionExercise(BaseModel):
    exercise_version_id: str
    sets: List[SetData] = Field(default_factory=list, max_length=100)


class GarminData(BaseModel):
    # Heart Rate
    avg_heart_rate: Optional[int] = Field(None, ge=0, le=300)
    max_heart_rate: Optional[int] = Field(None, ge=0, le=300)
    min_heart_rate: Optional[int] = Field(None, ge=0, le=300)

    # Basic Metrics
    calories: Optional[int] = Field(None, ge=0, le=100000)
    duration: Optional[int] = Field(None, ge=0, le=86400)  # in seconds (max 24 hours)
    distance: Optional[float] = Field(None, ge=0, le=1000000)  # in meters
    pace: Optional[float] = Field(None, ge=0, le=1000)  # min/km

    # Temperature
    avg_temperature: Optional[float] = Field(None, ge=-50, le=60)  # Celsius
    max_temperature: Optional[float] = Field(None, ge=-50, le=60)

    # Cadence
    avg_cadence: Optional[int] = Field(None, ge=0, le=300)  # steps/min or rpm
    max_cadence: Optional[int] = Field(None, ge=0, le=300)

    # Altitude
    avg_altitude: Optional[float] = Field(None, ge=-500, le=9000)  # meters
    max_altitude: Optional[float] = Field(None, ge=-500, le=9000)
    min_altitude: Optional[float] = Field(None, ge=-500, le=9000)
    ascent: Optional[float] = Field(None, ge=0, le=100000)  # total meters climbed
    descent: Optional[float] = Field(None, ge=0, le=100000)  # total meters descended
    elevation_gain: Optional[float] = Field(None, ge=0, le=100000)  # meters (alias for ascent)

    # Power (cycling)
    avg_power: Optional[int] = Field(None, ge=0, le=2000)  # watts
    max_power: Optional[int] = Field(None, ge=0, le=3000)  # watts

    # Steps
    total_steps: Optional[int] = Field(None, ge=0, le=1000000)

    # Activity Info
    activity_type: Optional[str] = Field(None, max_length=50)
    activity_notes: Optional[str] = Field(None, max_length=1000)

    # Advanced Running Metrics (FIT files)
    avg_vertical_oscillation: Optional[float] = Field(None, ge=0, le=500)  # mm
    avg_ground_contact_time: Optional[int] = Field(None, ge=0, le=1000)  # milliseconds
    avg_stride_length: Optional[float] = Field(None, ge=0, le=5000)  # meters

    # Training Metrics (FIT files)
    training_effect: Optional[float] = Field(None, ge=0, le=5)  # Aerobic training effect
    anaerobic_training_effect: Optional[float] = Field(None, ge=0, le=5)
    vo2max_estimate: Optional[int] = Field(None, ge=0, le=100)
    lactate_threshold_heart_rate: Optional[int] = Field(None, ge=0, le=300)
    recovery_time: Optional[int] = Field(None, ge=0, le=168)  # hours

    # Additional Metrics (FIT files)
    avg_respiration_rate: Optional[int] = Field(None, ge=0, le=100)  # breaths/min
    core_temperature: Optional[float] = Field(None, ge=30, le=45)  # Celsius
    power_left_right_balance: Optional[int] = Field(None, ge=0, le=100)  # percentage left
    stress_score: Optional[int] = Field(None, ge=0, le=100)

    # Data availability flags
    has_gps: Optional[bool] = False
    has_heart_rate: Optional[bool] = False
    has_temperature: Optional[bool] = False
    has_cadence: Optional[bool] = False
    has_power: Optional[bool] = False
    has_altitude: Optional[bool] = False
    has_running_dynamics: Optional[bool] = False
    has_training_metrics: Optional[bool] = False


class TimeSeriesDataPoint(BaseModel):
    timestamp: datetime
    value: float


class GpsDataPoint(BaseModel):
    timestamp: datetime
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation: Optional[float] = None  # meters


class TimeSeriesBatch(BaseModel):
    """Batched time-series data to reduce Firestore document count"""
    data: List[TimeSeriesDataPoint] = Field(..., max_length=200)


class GpsBatch(BaseModel):
    """Batched GPS data to reduce Firestore document count"""
    data: List[GpsDataPoint] = Field(..., max_length=200)


class WorkoutSessionBase(BaseModel):
    workout_plan_id: Optional[str] = None
    name: Optional[str] = Field(None, max_length=200)
    exercises: List[SessionExercise] = Field(default_factory=list, max_length=50)
    notes: Optional[str] = Field(None, max_length=5000)
    garmin_data: Optional[GarminData] = None


class WorkoutSessionCreate(WorkoutSessionBase):
    start_time: Optional[datetime] = None  # Allow creating sessions for past workouts


class WorkoutSessionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    exercises: Optional[List[SessionExercise]] = None
    garmin_data: Optional[GarminData] = None
    notes: Optional[str] = None
    end_time: Optional[datetime] = None


class WorkoutSession(WorkoutSessionBase):
    id: str
    user_id: str
    start_time: datetime
    end_time: Optional[datetime] = None

    class Config:
        from_attributes = True
