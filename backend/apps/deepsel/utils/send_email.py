"""
Unified Email Sending Function with Rate Limiting

This module provides a centralized function for sending emails with built-in rate limiting
to prevent abuse and comply with email provider limits.

All email sending in the application should use this function to ensure consistent
rate limiting and logging.
"""

import logging
import asyncio
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr

from apps.deepsel.models.organization import OrganizationModel
from apps.deepsel.utils.email_doser import get_global_email_doser, update_global_limits

logger = logging.getLogger(__name__)


class EmailRateLimitError(Exception):
    """Raised when email sending is rate limited."""

    def __init__(self, message: str, next_available_seconds: float):
        super().__init__(message)
        self.next_available_seconds = next_available_seconds


async def send_email_with_limit(
    db: Session,
    to: List[EmailStr],
    subject: str,
    content: str,
    organization_id: int = 1,
    scope: str = "global",
    template_context: Optional[
        Dict[str, Any]
    ] = None,  # Reserved for future template rendering
    content_type: str = "html",
    bypass_rate_limit: bool = False,
    email_campaign_id: Optional[int] = None,  # Link to campaign if part of campaign
) -> Dict[str, Any]:
    """
    Send an email with rate limiting.

    This is the unified function that ALL email sending in the application should use.
    It handles rate limiting, logging, error handling, and email tracking.

    Args:
        db: Database session
        to: List of recipient email addresses
        subject: Email subject
        content: Email content (HTML or plain text)
        organization_id: Organization ID for SMTP settings (default: 1)
        scope: Rate limiting scope (default: "global")
               Future: can be user_id, campaign_id, etc.
        template_context: Optional context for template rendering
        content_type: Content type ("html" or "plain")
        bypass_rate_limit: Skip rate limiting (use carefully!)

    Returns:
        Dict with status, message, and optional error information

    Raises:
        EmailRateLimitError: When rate limit is exceeded
    """

    # Get organization and update global rate limits
    org = db.query(OrganizationModel).get(organization_id)
    if not org:
        return {
            "success": False,
            "error": f"Organization {organization_id} not found",
            "status": "failed",
        }

    # Update global rate limits from organization settings
    rate_limit = getattr(org, "mail_send_rate_limit_per_hour", 200)
    if rate_limit is None:
        rate_limit = 200  # Default fallback

    # Update rate limits and get doser
    update_global_limits(rate_limit)
    doser = get_global_email_doser()

    # DOSER DEBUG: Show current status
    pre_status = doser.get_current_usage(scope)
    print(
        f"📊 DOSER: {pre_status['current_count']}/{pre_status['max_emails']} → sending {len(to)} email(s)",
        flush=True,
    )

    # Check rate limiting unless bypassed
    if not bypass_rate_limit:
        if not doser.can_send_email(scope):
            next_available = doser.get_next_available_time(scope)
            error_msg = (
                f"Rate limit exceeded. Can send again in {next_available:.1f} seconds."
            )
            print(f"🚫 RATE LIMITED! Wait {next_available:.1f}s", flush=True)
            logger.warning(
                f"Email rate limit exceeded for scope '{scope}': {error_msg}"
            )
            raise EmailRateLimitError(error_msg, next_available)
    else:
        print(f"🔧 BYPASSED rate limiting", flush=True)

    try:
        # Create message
        message = MessageSchema(
            subject=subject,
            recipients=to,
            body=content,
            subtype=content_type,
        )

        # Create connection configuration
        conf = ConnectionConfig(
            MAIL_USERNAME=org.mail_username,
            MAIL_PASSWORD=org.mail_password,
            MAIL_FROM=org.mail_from,
            MAIL_FROM_NAME=org.mail_from_name,
            MAIL_PORT=org.mail_port,
            MAIL_SERVER=org.mail_server,
            MAIL_SSL_TLS=org.mail_ssl_tls,
            MAIL_STARTTLS=org.mail_starttls,
            USE_CREDENTIALS=org.mail_use_credentials,
            VALIDATE_CERTS=org.mail_validate_certs,
            TIMEOUT=getattr(org, "mail_timeout", 60),
        )

        # Send email with retry logic
        fm = FastMail(conf)
        result = await _try_send_email_with_retry(fm, message)

        if result["success"]:
            # DOSER DEBUG: Record successful send in rate limiter (unless bypassed)
            if not bypass_rate_limit:
                print(f"📈 DOSER: Recording successful send...")
                doser.record_send(scope)
                print(f"✅ DOSER: Send recorded successfully!")
            else:
                print(f"🔧 DOSER: Bypassed - NOT recording send")

            # DOSER DEBUG: Show status AFTER successful send
            post_status = doser.get_current_usage(scope)
            print(
                f"📊 DOSER AFTER: {post_status['current_count']}/{post_status['max_emails']} emails used (scope: {scope})"
            )
            print(
                f"🎉 DOSER: Email sent successfully! Remaining: {post_status['max_emails'] - post_status['current_count']} emails"
            )
            return {
                "success": True,
                "status": "sent",
                "recipients_count": len(to),
            }
        else:
            # DOSER DEBUG: Show status (no change on failure)
            current_status = doser.get_current_usage(scope)
            print(
                f"❌ DOSER: Email send failed - count unchanged: {current_status['current_count']}/{current_status['max_emails']}"
            )

            logger.error(f"Failed to send email: {result['error']}")
            return {
                "success": False,
                "status": "failed",
                "error": result["error"],
            }

    except Exception as e:
        # DOSER DEBUG: Show status (no change on exception)
        current_status = doser.get_current_usage(scope)
        print(
            f"💥 DOSER: Unexpected error - count unchanged: {current_status['current_count']}/{current_status['max_emails']}"
        )

        logger.error(f"Unexpected error sending email: {e}")
        return {
            "success": False,
            "status": "failed",
            "error": str(e),
        }


async def _try_send_email_with_retry(
    fm: FastMail,
    message: MessageSchema,
    max_retries: int = 1,
    retry_delay: int = 300,  # 5 minutes
) -> Dict[str, Any]:
    """
    Try to send email with retry logic.

    Args:
        fm: FastMail instance
        message: Email message to send
        max_retries: Maximum number of retries (default: 1)
        retry_delay: Delay between retries in seconds (default: 300)

    Returns:
        Dict with success status and optional error message
    """
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            await fm.send_message(message)
            return {"success": True}
        except Exception as e:
            last_error = str(e)
            if attempt < max_retries:
                logger.warning(
                    f"Email send attempt {attempt + 1} failed: {e}. "
                    f"Retrying in {retry_delay} seconds..."
                )
                await asyncio.sleep(retry_delay)
            else:
                logger.error(
                    f"All {max_retries + 1} email send attempts failed. Last error: {e}"
                )

    return {"success": False, "error": last_error}


def get_current_rate_limit_status(scope: str = "global") -> Dict[str, Any]:
    """
    Get current rate limiting status for monitoring and debugging.

    Args:
        scope: Rate limiting scope (default: "global")

    Returns:
        Dict with current usage statistics
    """
    doser = get_global_email_doser()
    return doser.get_current_usage(scope)


def print_doser_status(scope: str = "global") -> None:
    """
    Print current doser status to console - useful for testing.

    Args:
        scope: Rate limiting scope (default: "global")
    """
    status = get_current_rate_limit_status(scope)
    print(f"📊 CURRENT DOSER STATUS:")
    print(f"   Scope: {status['scope']}")
    print(f"   Usage: {status['current_count']}/{status['max_emails']} emails per hour")
    print(f"   Time Window: {status['time_window_seconds']} seconds")
    if status["next_available_seconds"] > 0:
        print(f"   Next Available: {status['next_available_seconds']:.1f} seconds")
    else:
        print(f"   Status: ✅ Ready to send")
    print(f"   Remaining: {status['max_emails'] - status['current_count']} emails")
    logger.info(f"📊 Manual doser status check: {status}")


def cleanup_rate_limiter():
    """
    Clean up expired rate limiting data.
    Should be called periodically (e.g., via cron job) to prevent memory leaks.
    """
    doser = get_global_email_doser()
    doser.cleanup_expired()
    logger.info("Rate limiter cleanup completed")


# Legacy wrapper for backward compatibility
async def send_email(
    db: Session,
    to: List[EmailStr],
    subject: str,
    content: str,
    organization_id: int = 1,
    **kwargs,
) -> bool:
    """
    Legacy wrapper for backward compatibility.

    DEPRECATED: Use send_email_with_limit() for new code.
    """
    logger.warning(
        "Using deprecated send_email() function. Use send_email_with_limit() instead."
    )

    try:
        result = await send_email_with_limit(
            db=db,
            to=to,
            subject=subject,
            content=content,
            organization_id=organization_id,
            **kwargs,
        )
        return result["success"]
    except EmailRateLimitError:
        # For backward compatibility, return False instead of raising
        return False
