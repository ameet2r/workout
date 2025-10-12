"""
Tests for input validation and sanitization utilities
"""
import pytest
from fastapi import HTTPException
from app.utils.validation import sanitize_text_field, sanitize_html, validate_date_range


class TestSanitizeTextField:
    """Tests for sanitize_text_field function"""

    def test_trim_whitespace(self):
        """Should trim leading and trailing whitespace"""
        result = sanitize_text_field("  test  ", "Field")
        assert result == "test"

    def test_trim_tabs_and_newlines(self):
        """Should trim tabs and newlines"""
        result = sanitize_text_field("\t\ntest\n\t", "Field")
        assert result == "test"

    def test_reject_whitespace_only(self):
        """Should reject strings with only whitespace"""
        with pytest.raises(HTTPException) as exc_info:
            sanitize_text_field("   ", "Field")
        assert exc_info.value.status_code == 400
        assert "cannot be empty" in exc_info.value.detail.lower()

    def test_reject_empty_after_trim(self):
        """Should reject strings that become empty after trimming"""
        with pytest.raises(HTTPException) as exc_info:
            sanitize_text_field("\t\n  \n\t", "Field")
        assert exc_info.value.status_code == 400

    def test_handle_none(self):
        """Should return None when input is None"""
        result = sanitize_text_field(None, "Field")
        assert result is None

    def test_preserve_internal_whitespace(self):
        """Should preserve internal whitespace"""
        result = sanitize_text_field("  test  value  ", "Field")
        assert result == "test  value"

    def test_custom_field_name_in_error(self):
        """Should include custom field name in error message"""
        with pytest.raises(HTTPException) as exc_info:
            sanitize_text_field("  ", "Exercise name")
        assert "Exercise name" in exc_info.value.detail


class TestSanitizeHTML:
    """Tests for sanitize_html function"""

    def test_remove_script_tags(self):
        """Should remove script tags and their content"""
        result = sanitize_html("<p>Test</p><script>alert('xss')</script>")
        assert "<script>" not in result.lower()
        assert "alert" not in result

    def test_remove_iframe_tags(self):
        """Should remove iframe tags"""
        result = sanitize_html("<p>Test</p><iframe src='evil.com'></iframe>")
        assert "<iframe" not in result.lower()
        assert "evil.com" not in result

    def test_remove_event_handlers(self):
        """Should remove event handlers like onclick"""
        result = sanitize_html("<div onclick='alert(1)'>Test</div>")
        assert "onclick" not in result.lower()
        assert "alert" not in result

    def test_remove_javascript_protocol(self):
        """Should remove javascript: protocol"""
        result = sanitize_html("<a href='javascript:alert(1)'>Link</a>")
        assert "javascript:" not in result.lower()

    def test_handle_none(self):
        """Should return None when input is None"""
        result = sanitize_html(None)
        assert result is None

    def test_preserve_safe_html(self):
        """Should preserve safe HTML content"""
        safe_html = "<p>This is <b>bold</b> text</p>"
        result = sanitize_html(safe_html)
        # Should still contain the tags
        assert "<p>" in result
        assert "<b>" in result

    def test_case_insensitive_script_removal(self):
        """Should remove script tags regardless of case"""
        result = sanitize_html("<SCRIPT>alert('xss')</SCRIPT>")
        assert "script" not in result.lower()
        assert "alert" not in result


class TestValidateDateRange:
    """Tests for validate_date_range function"""

    def test_valid_date_range(self):
        """Should not raise error for valid date range"""
        # Should not raise
        validate_date_range("2024-01-01", "2024-12-31")

    def test_same_dates(self):
        """Should allow same start and end date"""
        # Should not raise
        validate_date_range("2024-01-01", "2024-01-01")

    def test_invalid_date_range(self):
        """Should raise error when end_date is before start_date"""
        with pytest.raises(HTTPException) as exc_info:
            validate_date_range("2024-12-31", "2024-01-01")
        assert exc_info.value.status_code == 400
        assert "after or equal to" in exc_info.value.detail.lower()

    def test_handle_none_start(self):
        """Should handle None start_date"""
        # Should not raise
        validate_date_range(None, "2024-12-31")

    def test_handle_none_end(self):
        """Should handle None end_date"""
        # Should not raise
        validate_date_range("2024-01-01", None)

    def test_handle_both_none(self):
        """Should handle both dates as None"""
        # Should not raise
        validate_date_range(None, None)

    def test_error_message_quality(self):
        """Should provide clear error message"""
        with pytest.raises(HTTPException) as exc_info:
            validate_date_range("2024-12-31", "2024-01-01")
        assert "End date" in exc_info.value.detail
        assert "start date" in exc_info.value.detail
