"""
Audit logging for sensitive operations
Logs security-relevant events to help with compliance and security monitoring
"""
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from app.core.firebase import get_firestore_client
from app.core.config import settings

# Configure audit logger
audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)

# Create console handler for development
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - AUDIT - %(message)s')
console_handler.setFormatter(formatter)
audit_logger.addHandler(console_handler)


def log_audit_event(
    event_type: str,
    user_id: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    action: str = "",
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> None:
    """
    Log an audit event to Firestore (only if ENABLE_AUDIT_LOGGING is true).

    Args:
        event_type: Type of event (e.g., "AUTH", "DATA_ACCESS", "DATA_MODIFICATION")
        user_id: ID of the user performing the action
        resource_type: Type of resource (e.g., "exercise", "workout_plan")
        resource_id: ID of the specific resource (if applicable)
        action: Specific action performed (e.g., "CREATE", "UPDATE", "DELETE", "VIEW")
        details: Additional context about the event
        ip_address: IP address of the requester
    """
    # Only log if audit logging is enabled
    if not settings.ENABLE_AUDIT_LOGGING:
        return

    try:
        audit_entry = {
            "timestamp": datetime.now(),
            "event_type": event_type,
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
            "details": details or {},
            "ip_address": ip_address
        }

        # Log to application logs
        audit_logger.info(
            f"{event_type} | User: {user_id} | Resource: {resource_type}:{resource_id} | "
            f"Action: {action} | IP: {ip_address}"
        )

        # Store in Firestore for persistent audit trail
        db = get_firestore_client()
        db.collection("audit_logs").add(audit_entry)

    except Exception as e:
        # Never let audit logging failure break the application
        # But log the error for investigation
        logging.error(f"Failed to write audit log: {str(e)}")


def log_security_event(
    event_type: str,
    user_id: Optional[str],
    details: Dict[str, Any],
    ip_address: Optional[str] = None
) -> None:
    """
    Log a security-related event (failed auth, rate limit exceeded, etc.)

    Args:
        event_type: Type of security event (e.g., "AUTH_FAILED", "RATE_LIMIT_EXCEEDED")
        user_id: ID of the user (if known)
        details: Details about the security event
        ip_address: IP address of the requester
    """
    log_audit_event(
        event_type="SECURITY",
        user_id=user_id or "UNKNOWN",
        resource_type="system",
        resource_id=None,
        action=event_type,
        details=details,
        ip_address=ip_address
    )


def log_data_access(
    user_id: str,
    resource_type: str,
    resource_id: str,
    action: str = "VIEW",
    ip_address: Optional[str] = None
) -> None:
    """
    Log data access events (viewing sensitive data)

    Args:
        user_id: ID of the user accessing the data
        resource_type: Type of resource being accessed
        resource_id: ID of the specific resource
        action: Type of access (VIEW, LIST, etc.)
        ip_address: IP address of the requester
    """
    log_audit_event(
        event_type="DATA_ACCESS",
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        ip_address=ip_address
    )


def log_data_modification(
    user_id: str,
    resource_type: str,
    resource_id: str,
    action: str,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> None:
    """
    Log data modification events (create, update, delete)

    Args:
        user_id: ID of the user modifying the data
        resource_type: Type of resource being modified
        resource_id: ID of the specific resource
        action: Type of modification (CREATE, UPDATE, DELETE)
        details: Additional details about the modification
        ip_address: IP address of the requester
    """
    log_audit_event(
        event_type="DATA_MODIFICATION",
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        details=details,
        ip_address=ip_address
    )
