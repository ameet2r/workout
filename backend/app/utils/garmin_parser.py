"""
Garmin file parser for TCX, GPX, and FIT formats
Extracts workout data and time-series metrics
"""
import io
import zipfile
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
from dateutil import parser as date_parser
import gpxpy
import gpxpy.gpx
from tcxparser import TCXParser
from fitparse import FitFile


BATCH_SIZE = 150  # Points per batch for Firestore subcollections


def _parse_timestamp(timestamp) -> datetime:
    """
    Convert timestamp to datetime object.
    Handles various input types: datetime, string, or XML element text
    """
    if isinstance(timestamp, datetime):
        return timestamp
    elif isinstance(timestamp, str):
        return date_parser.parse(timestamp)
    elif hasattr(timestamp, 'text'):
        # XML element
        return date_parser.parse(timestamp.text)
    else:
        # Try to convert to string and parse
        return date_parser.parse(str(timestamp))


def _parse_pace_to_float(pace_value) -> float:
    """
    Convert pace value to float (minutes per km/mile).
    Handles both numeric values and MM:SS time format strings.

    Args:
        pace_value: Can be float, int, or string in "MM:SS" format

    Returns:
        Float value representing pace in decimal minutes
    """
    if pace_value is None:
        return None

    # If already a number, return as float
    if isinstance(pace_value, (int, float)):
        return float(pace_value)

    # Convert to string and try parsing
    pace_str = str(pace_value).strip()

    # Check if it's in MM:SS format
    if ':' in pace_str:
        try:
            parts = pace_str.split(':')
            if len(parts) == 2:
                minutes = int(parts[0])
                seconds = int(parts[1])
                return minutes + (seconds / 60.0)
        except (ValueError, IndexError):
            pass

    # Try direct float conversion
    try:
        return float(pace_str)
    except ValueError:
        return None


def parse_tcx_file(file_content: bytes) -> Dict[str, Any]:
    """
    Parse TCX file and extract summary + time-series data

    Returns:
        {
            'summary': GarminData dict,
            'time_series': {
                'heart_rate': [(timestamp, value), ...],
                'gps': [(timestamp, lat, lon, elevation), ...],
                'temperature': [(timestamp, value), ...],
                'cadence': [(timestamp, value), ...]
            },
            'start_time': datetime
        }
    """
    try:
        # TCXParser expects a file-like object
        tcx = TCXParser(io.BytesIO(file_content))

        # Helper to safely convert values
        def safe_int(value):
            if value is None:
                return None
            # Handle timedelta objects (TCXParser returns duration as timedelta)
            if isinstance(value, timedelta):
                return int(value.total_seconds())
            try:
                return int(float(value))
            except (ValueError, TypeError):
                return None

        def safe_float(value):
            if value is None:
                return None
            # Handle timedelta objects
            if isinstance(value, timedelta):
                return float(value.total_seconds())
            try:
                return float(value)
            except (ValueError, TypeError):
                return None

        # Extract summary data from TCX parser
        summary = {
            # Basic metrics
            'duration': safe_int(tcx.duration),
            'distance': safe_float(tcx.distance),
            'calories': safe_int(tcx.calories),
            'pace': _parse_pace_to_float(tcx.pace),

            # Heart rate
            'avg_heart_rate': safe_int(tcx.hr_avg),
            'max_heart_rate': safe_int(tcx.hr_max),
            'min_heart_rate': safe_int(tcx.hr_min),

            # Altitude
            'avg_altitude': safe_float(tcx.altitude_avg),
            'max_altitude': safe_float(tcx.altitude_max),
            'min_altitude': safe_float(tcx.altitude_min),
            'ascent': safe_float(tcx.ascent),
            'descent': safe_float(tcx.descent),

            # Cadence
            'avg_cadence': safe_int(tcx.cadence_avg),
            'max_cadence': safe_int(tcx.cadence_max),

            # Power
            'avg_power': safe_int(tcx.power_avg),
            'max_power': safe_int(tcx.power_max),

            # Steps
            'total_steps': safe_int(tcx.total_steps),

            # Activity info
            'activity_type': str(tcx.activity_type) if tcx.activity_type else None,
            'activity_notes': str(tcx.activity_notes) if tcx.activity_notes else None,

            # Flags
            'has_gps': False,
            'has_heart_rate': bool(safe_int(tcx.hr_avg)),
            'has_temperature': False,
            'has_cadence': bool(safe_int(tcx.cadence_avg)),
            'has_power': bool(safe_int(tcx.power_avg)),
            'has_altitude': bool(safe_float(tcx.altitude_avg))
        }

        # Extract time-series data
        time_series = {
            'heart_rate': [],
            'gps': [],
            'temperature': [],
            'cadence': [],
            'power': [],
            'altitude': []
        }

        # Parse activity data
        activity = tcx.activity
        if activity and hasattr(activity, 'Lap'):
            for lap in activity.Lap:
                if hasattr(lap, 'Track'):
                    for track in lap.Track:
                        if hasattr(track, 'Trackpoint'):
                            for trackpoint in track.Trackpoint:
                                # Convert timestamp to datetime object
                                timestamp = _parse_timestamp(trackpoint.Time)

                                # Heart rate
                                if hasattr(trackpoint, 'HeartRateBpm') and trackpoint.HeartRateBpm:
                                    try:
                                        hr_value = safe_int(trackpoint.HeartRateBpm.Value)
                                        if hr_value is not None:
                                            time_series['heart_rate'].append((timestamp, hr_value))
                                            summary['has_heart_rate'] = True
                                    except (ValueError, AttributeError):
                                        pass

                                # GPS (Position)
                                if hasattr(trackpoint, 'Position') and trackpoint.Position:
                                    try:
                                        lat = safe_float(trackpoint.Position.LatitudeDegrees)
                                        lon = safe_float(trackpoint.Position.LongitudeDegrees)
                                        if lat is not None and lon is not None:
                                            elevation = None
                                            if hasattr(trackpoint, 'AltitudeMeters') and trackpoint.AltitudeMeters:
                                                elevation = safe_float(trackpoint.AltitudeMeters)
                                            time_series['gps'].append((timestamp, lat, lon, elevation))
                                            summary['has_gps'] = True
                                    except (ValueError, AttributeError):
                                        pass

                                # Altitude (separate from GPS)
                                if hasattr(trackpoint, 'AltitudeMeters') and trackpoint.AltitudeMeters:
                                    try:
                                        altitude_value = safe_float(trackpoint.AltitudeMeters)
                                        if altitude_value is not None:
                                            time_series['altitude'].append((timestamp, altitude_value))
                                            summary['has_altitude'] = True
                                    except (ValueError, AttributeError):
                                        pass

                                # Cadence
                                if hasattr(trackpoint, 'Cadence') and trackpoint.Cadence:
                                    try:
                                        cadence_value = safe_int(trackpoint.Cadence)
                                        if cadence_value is not None:
                                            time_series['cadence'].append((timestamp, cadence_value))
                                            summary['has_cadence'] = True
                                    except (ValueError, AttributeError):
                                        pass

                                # Extensions (for power, temperature, and other data)
                                if hasattr(trackpoint, 'Extensions') and trackpoint.Extensions:
                                    for extension in trackpoint.Extensions:
                                        # Power (Watts) - usually in extensions
                                        if hasattr(extension, 'tag') and 'Watts' in str(extension.tag):
                                            try:
                                                power_value = safe_int(extension.text)
                                                if power_value is not None:
                                                    time_series['power'].append((timestamp, power_value))
                                                    summary['has_power'] = True
                                            except (ValueError, AttributeError):
                                                pass

        # Calculate additional summary stats
        if time_series['cadence']:
            cadence_values = [c[1] for c in time_series['cadence']]
            summary['avg_cadence'] = int(sum(cadence_values) / len(cadence_values))
            summary['max_cadence'] = int(max(cadence_values))

        if time_series['gps'] and any(g[3] is not None for g in time_series['gps']):
            elevations = [g[3] for g in time_series['gps'] if g[3] is not None]
            if len(elevations) > 1:
                # Calculate elevation gain
                elevation_gain = 0
                for i in range(1, len(elevations)):
                    diff = elevations[i] - elevations[i-1]
                    if diff > 0:
                        elevation_gain += diff
                summary['elevation_gain'] = round(elevation_gain, 2)

        # Get start time
        start_time = None
        if tcx.started_at:
            # Ensure start_time is a datetime object
            if isinstance(tcx.started_at, datetime):
                start_time = tcx.started_at
            else:
                start_time = _parse_timestamp(tcx.started_at)

        return {
            'summary': summary,
            'time_series': time_series,
            'start_time': start_time
        }

    except Exception as e:
        raise ValueError(f"Failed to parse TCX file: {str(e)}")


def parse_gpx_file(file_content: bytes) -> Dict[str, Any]:
    """
    Parse GPX file and extract summary + time-series data

    Returns:
        {
            'summary': GarminData dict,
            'time_series': {
                'heart_rate': [(timestamp, value), ...],
                'gps': [(timestamp, lat, lon, elevation), ...],
                'temperature': [(timestamp, value), ...],
                'cadence': [(timestamp, value), ...]
            },
            'start_time': datetime
        }
    """
    try:
        gpx = gpxpy.parse(io.BytesIO(file_content))

        summary = {
            'duration': None,
            'distance': None,
            'calories': None,
            'avg_heart_rate': None,
            'max_heart_rate': None,
            'has_gps': False,
            'has_heart_rate': False,
            'has_temperature': False,
            'has_cadence': False,
            'has_power': False,
            'has_altitude': False
        }

        time_series = {
            'heart_rate': [],
            'gps': [],
            'temperature': [],
            'cadence': [],
            'power': [],
            'altitude': []
        }

        start_time = None
        hr_values = []
        temp_values = []
        cadence_values = []
        power_values = []

        for track in gpx.tracks:
            for segment in track.segments:
                for point in segment.points:
                    # Convert timestamp to datetime (gpxpy usually returns datetime, but be safe)
                    timestamp = point.time if isinstance(point.time, datetime) else _parse_timestamp(point.time) if point.time else None

                    if not start_time and timestamp:
                        start_time = timestamp

                    # GPS data
                    if point.latitude and point.longitude and timestamp:
                        elevation = float(point.elevation) if point.elevation else None
                        time_series['gps'].append((
                            timestamp,
                            float(point.latitude),
                            float(point.longitude),
                            elevation
                        ))
                        summary['has_gps'] = True

                        # Altitude data (separate from GPS)
                        if elevation is not None:
                            time_series['altitude'].append((timestamp, elevation))
                            summary['has_altitude'] = True

                    # Check extensions for HR, temperature, cadence
                    if timestamp and hasattr(point, 'extensions') and point.extensions:
                        for ext in point.extensions:
                            # Heart rate (Garmin extension)
                            if 'hr' in ext.tag.lower():
                                try:
                                    hr_value = int(ext.text)
                                    time_series['heart_rate'].append((timestamp, hr_value))
                                    hr_values.append(hr_value)
                                    summary['has_heart_rate'] = True
                                except (ValueError, AttributeError):
                                    pass

                            # Temperature
                            if 'temp' in ext.tag.lower() or 'atemp' in ext.tag.lower():
                                try:
                                    temp_value = float(ext.text)
                                    time_series['temperature'].append((timestamp, temp_value))
                                    temp_values.append(temp_value)
                                    summary['has_temperature'] = True
                                except (ValueError, AttributeError):
                                    pass

                            # Cadence
                            if 'cad' in ext.tag.lower():
                                try:
                                    cad_value = int(ext.text)
                                    time_series['cadence'].append((timestamp, cad_value))
                                    cadence_values.append(cad_value)
                                    summary['has_cadence'] = True
                                except (ValueError, AttributeError):
                                    pass

                            # Power
                            if 'power' in ext.tag.lower() or 'watts' in ext.tag.lower():
                                try:
                                    power_value = int(ext.text)
                                    time_series['power'].append((timestamp, power_value))
                                    power_values.append(power_value)
                                    summary['has_power'] = True
                                except (ValueError, AttributeError):
                                    pass

        # Calculate summary statistics
        if time_series['gps']:
            # Calculate total distance using gpxpy
            total_distance = gpx.length_3d() if gpx.length_3d() else gpx.length_2d()
            summary['distance'] = round(total_distance, 2) if total_distance else None

            # Calculate duration
            moving_data = gpx.get_moving_data()
            if moving_data:
                # moving_time is a timedelta object, convert to seconds
                moving_time = moving_data.moving_time
                if isinstance(moving_time, timedelta):
                    summary['duration'] = int(moving_time.total_seconds())
                else:
                    summary['duration'] = int(moving_time)

            # Elevation gain
            uphill, downhill = gpx.get_uphill_downhill()
            if uphill:
                summary['elevation_gain'] = round(uphill, 2)

        if hr_values:
            summary['avg_heart_rate'] = int(sum(hr_values) / len(hr_values))
            summary['max_heart_rate'] = int(max(hr_values))

        if temp_values:
            summary['avg_temperature'] = round(sum(temp_values) / len(temp_values), 1)
            summary['max_temperature'] = round(max(temp_values), 1)

        if cadence_values:
            summary['avg_cadence'] = int(sum(cadence_values) / len(cadence_values))
            summary['max_cadence'] = int(max(cadence_values))

        if power_values:
            summary['avg_power'] = int(sum(power_values) / len(power_values))
            summary['max_power'] = int(max(power_values))

        return {
            'summary': summary,
            'time_series': time_series,
            'start_time': start_time
        }

    except Exception as e:
        raise ValueError(f"Failed to parse GPX file: {str(e)}")


def parse_fit_file(file_content: bytes) -> Dict[str, Any]:
    """
    Parse FIT file and extract summary + time-series data

    Returns:
        {
            'summary': GarminData dict,
            'time_series': {
                'heart_rate': [(timestamp, value), ...],
                'gps': [(timestamp, lat, lon, elevation), ...],
                'temperature': [(timestamp, value), ...],
                'cadence': [(timestamp, value), ...],
                'power': [(timestamp, value), ...],
                'altitude': [(timestamp, value), ...]
            },
            'start_time': datetime
        }
    """
    try:
        fitfile = FitFile(io.BytesIO(file_content))

        summary = {
            # Basic metrics
            'duration': None,
            'distance': None,
            'calories': None,
            'pace': None,

            # Heart rate
            'avg_heart_rate': None,
            'max_heart_rate': None,
            'min_heart_rate': None,

            # Altitude
            'avg_altitude': None,
            'max_altitude': None,
            'min_altitude': None,
            'ascent': None,
            'descent': None,

            # Cadence
            'avg_cadence': None,
            'max_cadence': None,

            # Power
            'avg_power': None,
            'max_power': None,

            # Steps
            'total_steps': None,

            # Temperature
            'avg_temperature': None,
            'max_temperature': None,

            # Activity info
            'activity_type': None,
            'activity_notes': None,

            # Advanced Running Metrics
            'avg_vertical_oscillation': None,
            'avg_ground_contact_time': None,
            'avg_stride_length': None,

            # Training Metrics
            'training_effect': None,
            'anaerobic_training_effect': None,
            'vo2max_estimate': None,
            'lactate_threshold_heart_rate': None,
            'recovery_time': None,

            # Additional Metrics
            'avg_respiration_rate': None,
            'core_temperature': None,
            'power_left_right_balance': None,
            'stress_score': None,

            # Flags
            'has_gps': False,
            'has_heart_rate': False,
            'has_temperature': False,
            'has_cadence': False,
            'has_power': False,
            'has_altitude': False,
            'has_running_dynamics': False,
            'has_training_metrics': False
        }

        time_series = {
            'heart_rate': [],
            'gps': [],
            'temperature': [],
            'cadence': [],
            'power': [],
            'altitude': []
        }

        start_time = None

        # Parse session messages (summary data)
        for record in fitfile.get_messages('session'):
            for field in record:
                field_name = field.name
                field_value = field.value

                if field_value is None:
                    continue

                # Basic metrics
                if field_name == 'total_elapsed_time':
                    # Handle timedelta objects from FIT files
                    if isinstance(field_value, timedelta):
                        summary['duration'] = int(field_value.total_seconds())
                    else:
                        summary['duration'] = int(field_value)
                elif field_name == 'total_distance':
                    summary['distance'] = float(field_value)
                elif field_name == 'total_calories':
                    summary['calories'] = int(field_value)
                elif field_name == 'avg_speed' and field_value > 0:
                    # Convert m/s to min/km
                    summary['pace'] = round(1000 / (field_value * 60), 2)

                # Heart rate
                elif field_name == 'avg_heart_rate':
                    summary['avg_heart_rate'] = int(field_value)
                    summary['has_heart_rate'] = True
                elif field_name == 'max_heart_rate':
                    summary['max_heart_rate'] = int(field_value)

                # Altitude
                elif field_name == 'avg_altitude':
                    summary['avg_altitude'] = float(field_value)
                    summary['has_altitude'] = True
                elif field_name == 'max_altitude':
                    summary['max_altitude'] = float(field_value)
                elif field_name == 'total_ascent':
                    summary['ascent'] = float(field_value)
                elif field_name == 'total_descent':
                    summary['descent'] = float(field_value)

                # Cadence
                elif field_name == 'avg_cadence':
                    summary['avg_cadence'] = int(field_value)
                    summary['has_cadence'] = True
                elif field_name == 'max_cadence':
                    summary['max_cadence'] = int(field_value)

                # Power
                elif field_name == 'avg_power':
                    summary['avg_power'] = int(field_value)
                    summary['has_power'] = True
                elif field_name == 'max_power':
                    summary['max_power'] = int(field_value)

                # Steps
                elif field_name == 'total_steps':
                    summary['total_steps'] = int(field_value)

                # Temperature
                elif field_name == 'avg_temperature':
                    summary['avg_temperature'] = float(field_value)
                    summary['has_temperature'] = True
                elif field_name == 'max_temperature':
                    summary['max_temperature'] = float(field_value)

                # Activity type
                elif field_name == 'sport':
                    summary['activity_type'] = str(field_value)

                # Advanced Running Metrics
                elif field_name == 'avg_vertical_oscillation':
                    summary['avg_vertical_oscillation'] = float(field_value)
                    summary['has_running_dynamics'] = True
                elif field_name == 'avg_stance_time':
                    summary['avg_ground_contact_time'] = int(field_value)
                    summary['has_running_dynamics'] = True
                elif field_name == 'avg_stride_length':
                    summary['avg_stride_length'] = float(field_value)
                    summary['has_running_dynamics'] = True

                # Training Metrics
                elif field_name == 'total_training_effect':
                    summary['training_effect'] = float(field_value)
                    summary['has_training_metrics'] = True
                elif field_name == 'total_anaerobic_training_effect':
                    summary['anaerobic_training_effect'] = float(field_value)
                    summary['has_training_metrics'] = True

                # Start time
                elif field_name == 'start_time':
                    start_time = field_value

        # Parse record messages (time-series data)
        for record in fitfile.get_messages('record'):
            timestamp = None
            hr = None
            lat = None
            lon = None
            altitude = None
            cadence = None
            power = None
            temp = None

            for field in record:
                field_name = field.name
                field_value = field.value

                if field_value is None:
                    continue

                if field_name == 'timestamp':
                    timestamp = field_value
                elif field_name == 'heart_rate':
                    hr = int(field_value)
                elif field_name == 'position_lat':
                    # FIT stores as semicircles, convert to degrees
                    lat = float(field_value) * (180 / 2**31)
                elif field_name == 'position_long':
                    lon = float(field_value) * (180 / 2**31)
                elif field_name == 'altitude' or field_name == 'enhanced_altitude':
                    altitude = float(field_value)
                elif field_name == 'cadence':
                    cadence = int(field_value)
                elif field_name == 'power':
                    power = int(field_value)
                elif field_name == 'temperature':
                    temp = float(field_value)

            if timestamp:
                if not start_time:
                    start_time = timestamp

                if hr is not None:
                    time_series['heart_rate'].append((timestamp, hr))
                    summary['has_heart_rate'] = True

                if lat is not None and lon is not None:
                    time_series['gps'].append((timestamp, lat, lon, altitude))
                    summary['has_gps'] = True

                if altitude is not None:
                    time_series['altitude'].append((timestamp, altitude))
                    summary['has_altitude'] = True

                if cadence is not None:
                    time_series['cadence'].append((timestamp, cadence))
                    summary['has_cadence'] = True

                if power is not None:
                    time_series['power'].append((timestamp, power))
                    summary['has_power'] = True

                if temp is not None:
                    time_series['temperature'].append((timestamp, temp))
                    summary['has_temperature'] = True

        # Calculate min heart rate if we have time-series data
        if time_series['heart_rate']:
            hr_values = [hr[1] for hr in time_series['heart_rate']]
            summary['min_heart_rate'] = int(min(hr_values))
            if not summary['avg_heart_rate']:
                summary['avg_heart_rate'] = int(sum(hr_values) / len(hr_values))
            if not summary['max_heart_rate']:
                summary['max_heart_rate'] = int(max(hr_values))

        # Calculate min altitude if we have time-series data
        if time_series['altitude']:
            alt_values = [alt[1] for alt in time_series['altitude']]
            summary['min_altitude'] = float(min(alt_values))

        return {
            'summary': summary,
            'time_series': time_series,
            'start_time': start_time
        }

    except Exception as e:
        raise ValueError(f"Failed to parse FIT file: {str(e)}")


def parse_garmin_file(filename: str, file_content: bytes) -> Dict[str, Any]:
    """
    Auto-detect file type and parse accordingly.
    Supports .tcx, .gpx, .fit, and .zip files
    """
    filename_lower = filename.lower()

    # Handle ZIP files
    if filename_lower.endswith('.zip'):
        try:
            with zipfile.ZipFile(io.BytesIO(file_content)) as zf:
                # Find the first FIT, TCX, or GPX file
                for name in zf.namelist():
                    if name.lower().endswith('.fit'):
                        file_content = zf.read(name)
                        return parse_fit_file(file_content)
                    elif name.lower().endswith('.tcx'):
                        file_content = zf.read(name)
                        return parse_tcx_file(file_content)
                    elif name.lower().endswith('.gpx'):
                        file_content = zf.read(name)
                        return parse_gpx_file(file_content)
                raise ValueError("No FIT, TCX, or GPX file found in ZIP archive")
        except zipfile.BadZipFile:
            raise ValueError("Invalid ZIP file")

    # Handle FIT files
    elif filename_lower.endswith('.fit'):
        return parse_fit_file(file_content)

    # Handle TCX files
    elif filename_lower.endswith('.tcx'):
        return parse_tcx_file(file_content)

    # Handle GPX files
    elif filename_lower.endswith('.gpx'):
        return parse_gpx_file(file_content)

    else:
        raise ValueError(f"Unsupported file format. Please upload .fit, .tcx, .gpx, or .zip files")


def batch_time_series_data(data: List[Tuple[datetime, float]]) -> List[List[Dict[str, Any]]]:
    """
    Batch time-series data points into groups of BATCH_SIZE for Firestore

    Args:
        data: List of (timestamp, value) tuples

    Returns:
        List of batches, where each batch is a list of {timestamp, value} dicts
    """
    batches = []
    for i in range(0, len(data), BATCH_SIZE):
        batch = [
            {'timestamp': timestamp.isoformat(), 'value': value}
            for timestamp, value in data[i:i + BATCH_SIZE]
        ]
        batches.append(batch)
    return batches


def batch_gps_data(data: List[Tuple[datetime, float, float, Optional[float]]]) -> List[List[Dict[str, Any]]]:
    """
    Batch GPS data points into groups of BATCH_SIZE for Firestore

    Args:
        data: List of (timestamp, lat, lon, elevation) tuples

    Returns:
        List of batches, where each batch is a list of {timestamp, latitude, longitude, elevation} dicts
    """
    batches = []
    for i in range(0, len(data), BATCH_SIZE):
        batch = [
            {
                'timestamp': timestamp.isoformat(),
                'latitude': lat,
                'longitude': lon,
                'elevation': elevation
            }
            for timestamp, lat, lon, elevation in data[i:i + BATCH_SIZE]
        ]
        batches.append(batch)
    return batches
