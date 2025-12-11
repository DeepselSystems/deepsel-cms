# Sending Emails with Rate Limiting

This document guides developers and AI tools on how to properly send emails in the Deepsel CMS backend with built-in rate limiting.

## ⚠️ Important: Use the Unified Email Function

**ALL email sending in the application MUST use the unified function to ensure consistent rate limiting and compliance with email provider limits.**

## Quick Start

```python
from deepsel.utils.send_email import send_email_with_limit, EmailRateLimitError

# Basic usage
try:
    result = await send_email_with_limit(
        db=db,
        to=["user@example.com"],
        subject="Welcome to Deepsel CMS",
        content="<h1>Welcome!</h1><p>Thanks for joining us.</p>",
        organization_id=1
    )
    
    if result["success"]:
        print(f"Email sent successfully! ID: {result['email_id']}")
    else:
        print(f"Email failed: {result['error']}")
        
except EmailRateLimitError as e:
    print(f"Rate limited: {e}")
    print(f"Try again in {e.next_available_seconds} seconds")
```

## Function Reference

### `send_email_with_limit()`

The main function for sending emails with rate limiting.

```python
async def send_email_with_limit(
    db: Session,
    to: List[EmailStr],
    subject: str,
    content: str,
    organization_id: int = 1,
    scope: str = "global",
    template_context: Optional[Dict[str, Any]] = None,
    content_type: str = "html",
    bypass_rate_limit: bool = False,
) -> Dict[str, Any]
```

**Parameters:**

- `db`: Database session
- `to`: List of recipient email addresses
- `subject`: Email subject line
- `content`: Email content (HTML or plain text)
- `organization_id`: Organization ID for SMTP settings (default: 1)
- `scope`: Rate limiting scope (default: "global", future: user_id, campaign_id, etc.)
- `template_context`: Optional context for future template rendering
- `content_type`: Content type ("html" or "plain")
- `bypass_rate_limit`: Skip rate limiting (use with extreme caution!)

**Returns:**

```python
{
    "success": bool,           # Whether email was sent successfully
    "status": str,            # "sent" or "failed"
    "email_id": int,          # Database ID of email record
    "recipients_count": int,  # Number of recipients (success only)
    "error": str             # Error message (failure only)
}
```

**Exceptions:**

- `EmailRateLimitError`: Raised when rate limit is exceeded
  - `.next_available_seconds`: Float indicating when next email can be sent

## Rate Limiting System

### How It Works

1. **Global Rate Limiting**: Currently implements system-wide email rate limiting
2. **Configurable Limits**: Rate limits are set in organization settings (`mail_send_rate_limit_per_hour`)
3. **Automatic Enforcement**: All emails are counted against the rate limit
4. **Smart Tracking**: Uses sliding window algorithm to track email sends per hour

### Rate Limit Configuration

Rate limits are configured per organization in the database, but now we are using one org_id=1 for keep a central settings:

- Field: `mail_send_rate_limit_per_hour` in `organization` table
- Default: 200 emails per hour
- Set to 0 for unlimited (not recommended)

### Future Scoping Support

The system is designed to support different scopes of rate limiting:

```python
# Current: Global rate limiting
await send_email_with_limit(db, to, subject, content, scope="global")

# Future: User-specific rate limiting
await send_email_with_limit(db, to, subject, content, scope=f"user:{user_id}")

# Future: Campaign-specific rate limiting  
await send_email_with_limit(db, to, subject, content, scope=f"campaign:{campaign_id}")

# Future: IP-based rate limiting
await send_email_with_limit(db, to, subject, content, scope=f"ip:{client_ip}")
```

## Migration from Legacy Code

### OLD WAY (Don't do this)

```python
# ❌ Don't use FastMail directly
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

conf = ConnectionConfig(...)
fm = FastMail(conf)
await fm.send_message(message)
```

### NEW WAY (Correct)

```python
# ✅ Use the unified function
from deepsel.utils.send_email import send_email_with_limit

result = await send_email_with_limit(
    db=db,
    to=recipients,
    subject=subject,
    content=content
)
```

## Examples

### Basic Email Sending

```python
from deepsel.utils.send_email import send_email_with_limit

async def send_welcome_email(db: Session, user_email: str):
    try:
        result = await send_email_with_limit(
            db=db,
            to=[user_email],
            subject="Welcome to Deepsel CMS",
            content="<h1>Welcome!</h1><p>Thanks for joining us.</p>"
        )
        return result["success"]
    except EmailRateLimitError as e:
        logger.warning(f"Rate limited: {e}")
        return False
```

### Handling Rate Limits

```python
from deepsel.utils.send_email import send_email_with_limit, EmailRateLimitError

async def send_notification(db: Session, recipients: List[str], message: str):
    try:
        result = await send_email_with_limit(
            db=db,
            to=recipients,
            subject="Notification",
            content=message
        )
        
        if result["success"]:
            logger.info(f"Notification sent to {result['recipients_count']} recipients")
        else:
            logger.error(f"Notification failed: {result['error']}")
            
    except EmailRateLimitError as e:
        logger.warning(f"Rate limited: {e}")
        # Could implement queuing logic here
        # or schedule retry after e.next_available_seconds
```

### Template-Based Emails (EmailTemplateModel)

```python
# When updating existing EmailTemplateModel.send() method
from deepsel.utils.send_email import send_email_with_limit
from jinja2 import Template

async def send_template_email(self, db: Session, to: List[EmailStr], context: dict):
    # Render template
    template = Template(self.content)
    rendered_content = template.render(**context)
    
    subject_template = Template(self.subject)
    rendered_subject = subject_template.render(**context)
    
    # Use unified sending function
    try:
        result = await send_email_with_limit(
            db=db,
            to=to,
            subject=rendered_subject,
            content=rendered_content,
            organization_id=self.organization_id
        )
        return result["success"]
    except EmailRateLimitError:
        return False
```

## Monitoring and Debugging

### Check Current Rate Limit Status

```python
from deepsel.utils.send_email import get_current_rate_limit_status

# Get current usage
status = get_current_rate_limit_status("global")
print(f"Emails sent in current hour: {status['current_count']}/{status['max_emails']}")
print(f"Next email available in: {status['next_available_seconds']} seconds")
```

### Cleanup (for maintenance tasks)

```python
from deepsel.utils.send_email import cleanup_rate_limiter

# Clean up expired rate limiting data (call periodically)
cleanup_rate_limiter()
```

## Error Handling Best Practices

1. **Always handle EmailRateLimitError** - This is expected behavior, not a bug
2. **Log appropriate messages** - Help with debugging and monitoring
3. **Consider queuing** - For non-urgent emails that hit rate limits
4. **Monitor email records** - Check EmailOutModel for send status

```python
import logging
from deepsel.utils.send_email import send_email_with_limit, EmailRateLimitError

logger = logging.getLogger(__name__)

async def robust_email_send(db: Session, to: List[str], subject: str, content: str):
    try:
        result = await send_email_with_limit(
            db=db, to=to, subject=subject, content=content
        )
        
        if result["success"]:
            logger.info(f"Email sent successfully. ID: {result['email_id']}")
            return True
        else:
            logger.error(f"Email send failed: {result['error']}")
            return False
            
    except EmailRateLimitError as e:
        logger.warning(f"Email rate limited: {e}")
        # Could implement retry logic, queuing, etc.
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email: {e}")
        return False
```

## Configuration

### Database Schema

The rate limiting uses the existing organization table:

- `mail_send_rate_limit_per_hour`: Integer, emails per hour limit
- Default: 200, Set to 0 for unlimited

### Environment Variables

No additional environment variables needed. Configuration comes from the database.

## Troubleshooting

### Common Issues

1. **"Rate limit exceeded" errors**
   - Check current usage with `get_current_rate_limit_status()`
   - Verify organization rate limit setting
   - Consider if this is expected behavior

2. **Emails not sending**
   - Check EmailOutModel records for error details
   - Verify SMTP configuration in organization settings
   - Check application logs for detailed error messages

3. **Performance concerns**
   - Rate limiter uses in-memory storage with cleanup
   - For high-volume deployments, consider database-backed rate limiting
   - Monitor memory usage if sending many emails

### Debugging Commands

```python
# Check rate limit status
from deepsel.utils.send_email import get_current_rate_limit_status
print(get_current_rate_limit_status())

# Check recent email records
from deepsel.models.email_out import EmailOutModel
recent_emails = db.query(EmailOutModel).order_by(EmailOutModel.created_at.desc()).limit(10).all()

# Force cleanup (if memory concerns)
from deepsel.utils.send_email import cleanup_rate_limiter
cleanup_rate_limiter()
```

## AI Tools and Code Generation

When generating code that sends emails:

1. ✅ **ALWAYS use `send_email_with_limit()`**
2. ✅ **Handle `EmailRateLimitError` exceptions**
3. ✅ **Use proper error logging**
4. ❌ **NEVER use FastMail directly**
5. ❌ **NEVER bypass rate limiting without good reason**

This ensures consistent behavior and compliance with email provider limits across all generated and modified code.
