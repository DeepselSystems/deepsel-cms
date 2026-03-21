import asyncio
from unittest.mock import patch, MagicMock, AsyncMock

import pytest

from apps.core.utils.email_doser import EmailDoser
from apps.core.utils.send_email import (
    send_email_with_limit,
    EmailRateLimitError,
    _try_send_email_with_retry,
)


def _run(coro):
    """Helper to run async functions in sync tests."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _make_mock_org():
    """Create a mock organization with SMTP settings."""
    org = MagicMock()
    org.mail_username = "test@example.com"
    org.mail_password = "password"
    org.mail_from = "test@example.com"
    org.mail_from_name = "Test"
    org.mail_port = 587
    org.mail_server = "smtp.example.com"
    org.mail_ssl_tls = False
    org.mail_starttls = True
    org.mail_use_credentials = True
    org.mail_validate_certs = False
    org.mail_timeout = 60
    org.mail_send_rate_limit_per_hour = 200
    return org


@patch("apps.core.utils.send_email.FastMail")
@patch("apps.core.utils.send_email.get_global_email_doser")
@patch("apps.core.utils.send_email.update_global_limits")
def test_successful_send(mock_update, mock_get_doser, mock_fastmail):
    doser = EmailDoser(max_emails=200, per_seconds=3600)
    mock_get_doser.return_value = doser

    mock_fm_instance = MagicMock()
    mock_fm_instance.send_message = AsyncMock()
    mock_fastmail.return_value = mock_fm_instance

    mock_org = _make_mock_org()
    db = MagicMock()
    db.query.return_value.get.return_value = mock_org

    result = _run(
        send_email_with_limit(
            db=db,
            to=["recipient@example.com"],
            subject="Test",
            content="<p>Hello</p>",
        )
    )

    assert result["success"] is True
    assert result["status"] == "sent"
    assert result["recipients_count"] == 1
    mock_fm_instance.send_message.assert_awaited_once()


@patch("apps.core.utils.send_email.get_global_email_doser")
@patch("apps.core.utils.send_email.update_global_limits")
def test_rate_limited(mock_update, mock_get_doser):
    doser = EmailDoser(max_emails=1, per_seconds=3600)
    doser.record_send()  # exhaust limit
    mock_get_doser.return_value = doser

    mock_org = _make_mock_org()
    db = MagicMock()
    db.query.return_value.get.return_value = mock_org

    with pytest.raises(EmailRateLimitError):
        _run(
            send_email_with_limit(
                db=db,
                to=["recipient@example.com"],
                subject="Test",
                content="<p>Hello</p>",
            )
        )


@patch("apps.core.utils.send_email.FastMail")
@patch("apps.core.utils.send_email.get_global_email_doser")
@patch("apps.core.utils.send_email.update_global_limits")
def test_bypass_rate_limit(mock_update, mock_get_doser, mock_fastmail):
    doser = EmailDoser(max_emails=1, per_seconds=3600)
    doser.record_send()  # exhaust limit
    mock_get_doser.return_value = doser

    mock_fm_instance = MagicMock()
    mock_fm_instance.send_message = AsyncMock()
    mock_fastmail.return_value = mock_fm_instance

    mock_org = _make_mock_org()
    db = MagicMock()
    db.query.return_value.get.return_value = mock_org

    result = _run(
        send_email_with_limit(
            db=db,
            to=["recipient@example.com"],
            subject="Test",
            content="<p>Hello</p>",
            bypass_rate_limit=True,
        )
    )

    assert result["success"] is True
    # Doser count should not increase when bypassed
    usage = doser.get_current_usage()
    assert usage["current_count"] == 1


def test_org_not_found():
    db = MagicMock()
    db.query.return_value.get.return_value = None

    result = _run(
        send_email_with_limit(
            db=db,
            to=["recipient@example.com"],
            subject="Test",
            content="<p>Hello</p>",
        )
    )

    assert result["success"] is False
    assert "not found" in result["error"]


@patch("apps.core.utils.send_email.asyncio.sleep", new_callable=AsyncMock)
@patch("apps.core.utils.send_email.FastMail")
@patch("apps.core.utils.send_email.get_global_email_doser")
@patch("apps.core.utils.send_email.update_global_limits")
def test_smtp_failure(mock_update, mock_get_doser, mock_fastmail, mock_sleep):
    doser = EmailDoser(max_emails=200, per_seconds=3600)
    mock_get_doser.return_value = doser

    mock_fm_instance = MagicMock()
    mock_fm_instance.send_message = AsyncMock(
        side_effect=Exception("SMTP connection refused")
    )
    mock_fastmail.return_value = mock_fm_instance

    mock_org = _make_mock_org()
    db = MagicMock()
    db.query.return_value.get.return_value = mock_org

    result = _run(
        send_email_with_limit(
            db=db,
            to=["recipient@example.com"],
            subject="Test",
            content="<p>Hello</p>",
        )
    )

    assert result["success"] is False
    assert "SMTP connection refused" in result["error"]


def test_retry_succeeds_on_second_attempt():
    mock_fm = MagicMock()
    mock_fm.send_message = AsyncMock(side_effect=[Exception("Temporary failure"), None])

    mock_message = MagicMock()

    result = _run(
        _try_send_email_with_retry(mock_fm, mock_message, max_retries=1, retry_delay=0)
    )

    assert result["success"] is True
    assert mock_fm.send_message.await_count == 2


def test_retry_exhausted():
    mock_fm = MagicMock()
    mock_fm.send_message = AsyncMock(side_effect=Exception("Persistent failure"))

    mock_message = MagicMock()

    result = _run(
        _try_send_email_with_retry(mock_fm, mock_message, max_retries=1, retry_delay=0)
    )

    assert result["success"] is False
    assert "Persistent failure" in result["error"]
    assert mock_fm.send_message.await_count == 2
