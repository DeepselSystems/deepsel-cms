from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db import get_db
from deepsel.utils.get_current_user import get_current_user
from deepsel.models.user import UserModel
from deepsel.utils.models_pool import models_pool
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import logging
import requests

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conflict_resolution", tags=["Conflict Resolution"])


def generate_manual_explanation(conflicts):
    """Generate a simple manual explanation when AI fails."""
    if len(conflicts) == 1:
        conflict = conflicts[0]
        if conflict.get("type") == "new_server_content":
            return f"<p><strong>New content detected:</strong> The server has new content in {conflict['locale']} that you don't have locally.</p>"
        elif conflict.get("type") == "new_user_content":
            return f"<p><strong>New local content:</strong> You have new content in {conflict['locale']} that doesn't exist on the server.</p>"
        else:
            return f"<p><strong>Content modified:</strong> The {conflict['locale']} version has been changed by another user. Please review the differences.</p>"
    else:
        return f"<p><strong>Multiple conflicts detected:</strong> {len(conflicts)} language versions have conflicts. Please review each one carefully.</p>"


async def generate_conflict_explanation(
    user_contents, server_contents, record_type, db: Session, current_user
):
    """Generate an AI explanation of the conflicts between user and server contents."""
    try:
        # Get organization settings for AI API key - use CMS settings model
        from apps.cms.models.organization import CMSSettingsModel

        # Get organization from current user (same pattern as translate endpoints)
        org_id = current_user.organization_id
        org = db.query(CMSSettingsModel).filter(CMSSettingsModel.id == org_id).first()
        if not org or not org.openrouter_api_key:
            return "<p><strong>AI service not configured.</strong> Conflicts detected between your version and the server version. Please review and resolve manually.</p>"

        api_key = org.openrouter_api_key
        # Use hardcoded reliable model for conflict explanations
        model = "openai/gpt-4o"

        # Prepare content comparison for AI analysis
        conflicts = []

        # Create a mapping of locale_id to content for easy comparison
        user_content_map = {}
        if user_contents:
            for content in user_contents:
                locale_id = content.get("locale_id")
                if locale_id:
                    user_content_map[locale_id] = content

        server_content_map = {}
        if server_contents:
            for content in server_contents:
                locale_id = content.get("locale_id") or (
                    content.get("locale") and content["locale"].get("id")
                )
                if locale_id:
                    server_content_map[locale_id] = content

        # Find conflicts by comparing contents
        all_locale_ids = set(user_content_map.keys()) | set(server_content_map.keys())

        for locale_id in all_locale_ids:
            user_content = user_content_map.get(locale_id)
            server_content = server_content_map.get(locale_id)

            if user_content and server_content:
                # Both versions exist, check for differences
                user_title = user_content.get("title", "")
                server_title = server_content.get("title", "")
                user_content_text = user_content.get("content", "")
                server_content_text = server_content.get("content", "")

                # Extract text content for pages (JSON format)
                if record_type == "page" and isinstance(user_content_text, dict):
                    user_content_text = user_content_text.get("main", {}).get(
                        "ds-value", ""
                    )
                if record_type == "page" and isinstance(server_content_text, dict):
                    server_content_text = server_content_text.get("main", {}).get(
                        "ds-value", ""
                    )

                if (
                    user_title != server_title
                    or user_content_text != server_content_text
                ):
                    locale_name = server_content.get("locale", {}).get(
                        "name", f"Locale {locale_id}"
                    )
                    conflicts.append(
                        {
                            "locale": locale_name,
                            "user_title": user_title,
                            "server_title": server_title,
                            "user_content": str(user_content_text)[:300]
                            + ("..." if len(str(user_content_text)) > 300 else ""),
                            "server_content": str(server_content_text)[:300]
                            + ("..." if len(str(server_content_text)) > 300 else ""),
                        }
                    )
            elif user_content and not server_content:
                # User has new content that doesn't exist on server
                locale_name = f"Locale {locale_id}"
                conflicts.append(
                    {
                        "locale": locale_name,
                        "type": "new_user_content",
                        "user_title": user_content.get("title", ""),
                    }
                )
            elif server_content and not user_content:
                # Server has new content that user doesn't have
                locale_name = server_content.get("locale", {}).get(
                    "name", f"Locale {locale_id}"
                )
                conflicts.append(
                    {
                        "locale": locale_name,
                        "type": "new_server_content",
                        "server_title": server_content.get("title", ""),
                    }
                )

        if not conflicts:
            return "<p>No significant content conflicts detected between your version and the server version.</p>"

        # Prepare prompt for AI
        prompt = f"""You are helping resolve content conflicts in a CMS system. A user was editing a {record_type} when conflicts were detected with newer server versions.

Please analyze these conflicts and provide a clear, helpful explanation in HTML format that helps the user understand:
1. What changed between versions
2. The significance of the conflicts  
3. What they should consider when resolving

Format your response as proper HTML with:
- Use <strong> for emphasis on important points
- Use <ul> and <li> for lists if needed
- Use <p> tags for paragraphs
- Keep it concise (2-3 sentences or bullet points)

Conflicts found:
"""

        for conflict in conflicts[
            :3
        ]:  # Limit to first 3 conflicts to avoid token limit
            if conflict.get("type") == "new_user_content":
                prompt += f"\n- {conflict['locale']}: You added new content '{conflict['user_title']}' that doesn't exist on the server.\n"
            elif conflict.get("type") == "new_server_content":
                prompt += f"\n- {conflict['locale']}: Server has new content '{conflict['server_title']}' that you don't have locally.\n"
            else:
                prompt += f"\n- {conflict['locale']}:\n"
                prompt += f"  Your title: '{conflict['user_title']}'\n"
                prompt += f"  Server title: '{conflict['server_title']}'\n"
                if conflict["user_content"] != conflict["server_content"]:
                    prompt += f"  Content also differs between versions.\n"

        prompt += "\nProvide a concise HTML explanation suitable for a content editor:"

        # Make request to OpenRouter API (same as chat.py)
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://deepsel.com",
                    "X-Title": "DeepSel CMS",
                },
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a helpful assistant that explains content conflicts in a CMS. Respond with ONLY clean HTML markup using <p>, <strong>, and <ul>/<li> tags. Do not wrap your response in code blocks or markdown. Return pure HTML that can be directly inserted into a web page.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500,
                },
                timeout=20.0,
            )

            if response.status_code == 200:
                result = response.json()

                if (
                    "choices" in result
                    and len(result["choices"]) > 0
                    and "message" in result["choices"][0]
                ):
                    message = result["choices"][0]["message"]
                    explanation = message.get("content", "").strip()

                    # For reasoning models (like GPT-5), check reasoning field if content is empty
                    if not explanation and "reasoning" in message:
                        reasoning = message.get("reasoning", "")
                        # Extract the actual response from reasoning if available
                        explanation = reasoning.strip()

                    if explanation:
                        return explanation
                    else:
                        return generate_manual_explanation(conflicts)
                else:
                    logger.error(f"Unexpected API response structure: {result}")
                    return generate_manual_explanation(conflicts)
            else:
                logger.error(
                    f"OpenRouter API error: {response.status_code} {response.text}"
                )
                return generate_manual_explanation(conflicts)

        except requests.exceptions.RequestException as e:
            logger.error(f"Request exception during AI API call: {str(e)}")
            return generate_manual_explanation(conflicts)
        except Exception as e:
            logger.error(f"Unexpected error during AI API call: {str(e)}")
            return generate_manual_explanation(conflicts)

    except Exception as e:
        logger.error(f"Error generating conflict explanation: {str(e)}")
        return "Conflicts detected between your version and the server version. Please review and resolve manually."


# Generate proper response schemas using the same system as other CRUD routers
BlogPostSchemas = generate_CRUD_schemas("blog_post")
PageSchemas = generate_CRUD_schemas("page")


class ConflictCheckRequest(BaseModel):
    record_type: str  # 'blog_post' or 'page'
    record_id: int
    edit_start_timestamp: str  # ISO timestamp when user started editing
    user_contents: Optional[list] = None  # User's current contents for AI explanation


class ConflictCheckResponse(BaseModel):
    has_conflict: bool
    newer_record: Optional[Dict[str, Any]] = None  # Full record with all contents
    last_modified_at: Optional[str] = None
    last_modified_by: Optional[str] = None
    conflict_explanation: Optional[str] = None  # AI-generated explanation of conflicts


@router.post("/check-conflict", response_model=ConflictCheckResponse)
async def check_for_conflicts(
    request: ConflictCheckRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    Simple conflict detection: check if record was modified after user started editing.
    Returns full record with all contents if conflict exists.
    """
    try:
        from datetime import timezone

        # Parse the edit start timestamp
        edit_start = datetime.fromisoformat(
            request.edit_start_timestamp.replace("Z", "+00:00")
        )

        # Get the main record (blog_post or page)
        if request.record_type == "blog_post":
            main_model = models_pool["blog_post"]
            record_schema = BlogPostSchemas.Read
        elif request.record_type == "page":
            main_model = models_pool["page"]
            record_schema = PageSchemas.Read
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid record type"
            )

        # Get the main record with all relationships
        main_record = (
            db.query(main_model).filter(main_model.id == request.record_id).first()
        )

        if not main_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Record not found"
            )

        # Check all content versions for conflicts
        has_conflict = False
        last_modified_at = None
        last_modified_by = "System"  # Default to System instead of Unknown user

        if hasattr(main_record, "contents") and main_record.contents:
            for content in main_record.contents:
                if hasattr(content, "last_modified_at") and content.last_modified_at:
                    content_last_modified = content.last_modified_at

                    # Handle timezone comparison
                    if content_last_modified.tzinfo is None:
                        content_last_modified = content_last_modified.replace(
                            tzinfo=timezone.utc
                        )

                    if edit_start.tzinfo is None:
                        edit_start = edit_start.replace(tzinfo=timezone.utc)

                    if content_last_modified > edit_start:
                        has_conflict = True
                        if (
                            not last_modified_at
                            or content_last_modified
                            > datetime.fromisoformat(last_modified_at)
                        ):
                            last_modified_at = content_last_modified.isoformat()

                            # Get the user who made the modification from updated_by
                            last_modifier = (
                                content.updated_by
                                if hasattr(content, "updated_by")
                                else None
                            )

                            if last_modifier:
                                # Get display name from user
                                display_name = (
                                    getattr(last_modifier, "name", None)
                                    or f"{getattr(last_modifier, 'first_name', '') or ''} {getattr(last_modifier, 'last_name', '') or ''}".strip()
                                    or getattr(last_modifier, "username", None)
                                    or getattr(last_modifier, "email", None)
                                )
                                if display_name:
                                    last_modified_by = display_name

        if has_conflict:
            # Use the same schema as the CRUD router to serialize the full record
            newer_record = record_schema.model_validate(main_record).model_dump()

            # Generate AI explanation of conflicts if user contents provided
            conflict_explanation = None
            if request.user_contents:
                try:
                    conflict_explanation = await generate_conflict_explanation(
                        request.user_contents,
                        newer_record.get("contents", []),
                        request.record_type,
                        db,
                        current_user,
                    )
                except Exception as e:
                    logger.error(f"Error generating conflict explanation: {str(e)}")
                    conflict_explanation = "Unable to generate explanation. Please review the conflicts manually."

            return ConflictCheckResponse(
                has_conflict=True,
                newer_record=newer_record,
                last_modified_at=last_modified_at,
                last_modified_by=last_modified_by,
                conflict_explanation=conflict_explanation,
            )

        return ConflictCheckResponse(has_conflict=False)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timestamp format: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Error checking for conflicts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking for conflicts",
        )


@router.get("/active-editors/{record_type}/{record_id}")
async def get_active_editors(
    record_type: str,
    record_id: int,
    content_id: Optional[int] = None,
    current_user: UserModel = Depends(get_current_user),
):
    """Get list of users currently editing a specific record."""
    from apps.cms.utils.edit_session_manager import edit_session_manager

    try:
        active_sessions = edit_session_manager.get_active_editors(
            record_type, record_id, content_id
        )

        editors = []
        for session in active_sessions:
            if session.user_id != current_user.id:  # Exclude current user
                editors.append(
                    {
                        "user_id": session.user_id,
                        "username": session.username,
                        "display_name": session.display_name,
                        "started_at": session.started_at.isoformat(),
                    }
                )

        return {"active_editors": editors, "count": len(editors)}

    except Exception as e:
        logger.error(f"Error getting active editors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting active editors",
        )
