"""
Input validation and sanitization utilities
"""
import re
from typing import Optional
from fastapi import HTTPException


def sanitize_text_field(value: Optional[str], field_name: str = "Field") -> Optional[str]:
    """
    Strip whitespace and validate non-empty text fields.
    Prevents whitespace-only input and potential data pollution.

    Args:
        value: The input string to sanitize
        field_name: Name of the field for error messages

    Returns:
        Sanitized string or None if input was None

    Raises:
        HTTPException: If field contains only whitespace
    """
    if value is None:
        return None

    cleaned = value.strip()

    # Check if the result is empty after stripping
    if not cleaned:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} cannot be empty or contain only whitespace"
        )

    return cleaned


def sanitize_html(value: Optional[str]) -> Optional[str]:
    """
    Remove potentially dangerous HTML tags and attributes.
    Allows safe formatting tags but strips script, iframe, etc.

    Args:
        value: The input string that may contain HTML

    Returns:
        Sanitized string with dangerous content removed
    """
    if value is None:
        return None

    # Remove script tags and their content
    value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)

    # Remove iframe tags
    value = re.sub(r'<iframe[^>]*>.*?</iframe>', '', value, flags=re.IGNORECASE | re.DOTALL)

    # Remove event handlers (onclick, onerror, etc.)
    value = re.sub(r'\son\w+\s*=\s*["\']?[^"\']*["\']?', '', value, flags=re.IGNORECASE)

    # Remove javascript: protocol
    value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)

    return value.strip()


def validate_date_range(start_date: Optional[str], end_date: Optional[str]) -> None:
    """
    Validate that end_date is after or equal to start_date.

    Args:
        start_date: Start date in ISO format (YYYY-MM-DD)
        end_date: End date in ISO format (YYYY-MM-DD)

    Raises:
        HTTPException: If end_date is before start_date
    """
    if start_date and end_date:
        if end_date < start_date:
            raise HTTPException(
                status_code=400,
                detail="End date must be after or equal to start date"
            )
