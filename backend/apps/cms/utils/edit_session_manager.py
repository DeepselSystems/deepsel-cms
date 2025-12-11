from typing import Dict, List, Optional
from datetime import datetime
import json
from dataclasses import dataclass
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


@dataclass
class EditSession:
    user_id: int
    username: str
    display_name: str
    websocket: WebSocket
    started_at: datetime
    record_type: str  # 'blog_post' or 'page'
    record_id: int
    content_id: Optional[int] = None  # for specific content editing


class EditSessionManager:
    """Manages real-time editing sessions for conflict detection and parallel edit warnings."""

    def __init__(self):
        # Structure: {record_key: {user_id: EditSession}}
        self.active_sessions: Dict[str, Dict[int, EditSession]] = {}

    def _get_record_key(
        self, record_type: str, record_id: int, content_id: Optional[int] = None
    ) -> str:
        """Generate a unique key for the record being edited."""
        if content_id:
            return f"{record_type}_content:{record_id}:{content_id}"
        return f"{record_type}:{record_id}"

    async def start_edit_session(self, session: EditSession) -> List[EditSession]:
        """
        Start a new edit session and return list of existing sessions for conflict detection.
        Returns other users currently editing the same record.
        """
        record_key = self._get_record_key(
            session.record_type, session.record_id, session.content_id
        )

        # Get existing sessions for this record
        existing_sessions = self.active_sessions.get(record_key, {})
        other_sessions = [
            s for s in existing_sessions.values() if s.user_id != session.user_id
        ]

        # Close any existing session for the same user to prevent duplicates
        if (
            record_key in self.active_sessions
            and session.user_id in self.active_sessions[record_key]
        ):
            existing_user_session = self.active_sessions[record_key][session.user_id]
            logger.info(
                f"Replacing existing session for user {session.user_id} on {record_key}"
            )
            try:
                if (
                    existing_user_session.websocket
                    and existing_user_session.websocket.client_state.name == "CONNECTED"
                ):
                    await existing_user_session.websocket.close()
            except Exception as e:
                logger.debug(
                    f"Failed to close existing WebSocket for user {session.user_id}: {e}"
                )

        # Add the new session (this will overwrite any existing session for the same user)
        if record_key not in self.active_sessions:
            self.active_sessions[record_key] = {}
        self.active_sessions[record_key][session.user_id] = session

        # Only notify if there are actually OTHER users editing (not the same user)
        if other_sessions:
            logger.info(
                f"Parallel editing detected: {session.username} joining {len(other_sessions)} other users on {record_key}"
            )
            await self._notify_parallel_edit_detected(session, other_sessions)
        else:
            logger.info(
                f"Edit session started: {session.username} editing {record_key} (no other users)"
            )

        return other_sessions

    async def end_edit_session(
        self,
        user_id: int,
        record_type: str,
        record_id: int,
        content_id: Optional[int] = None,
    ):
        """End an edit session."""
        record_key = self._get_record_key(record_type, record_id, content_id)

        logger.info(f"Attempting to end session for user {user_id} on {record_key}")
        logger.info(f"Current active sessions: {list(self.active_sessions.keys())}")

        if record_key in self.active_sessions:
            logger.info(
                f"Found record {record_key} with users: {list(self.active_sessions[record_key].keys())}"
            )

            if user_id in self.active_sessions[record_key]:
                session = self.active_sessions[record_key][user_id]

                # Get remaining sessions BEFORE removing the user
                remaining_sessions = [
                    s
                    for uid, s in self.active_sessions[record_key].items()
                    if uid != user_id
                ]

                # Remove the user session
                del self.active_sessions[record_key][user_id]

                # Clean up empty record entries
                if not self.active_sessions[record_key]:
                    del self.active_sessions[record_key]

                logger.info(
                    f"✅ Edit session ended: {session.username} stopped editing {record_key}"
                )
                logger.info(
                    f"Remaining active sessions: {list(self.active_sessions.keys())}"
                )
                logger.info(
                    f"Notifying {len(remaining_sessions)} remaining users about user leaving"
                )

                # Notify remaining users about the user leaving
                await self._notify_user_left(session, remaining_sessions)

                # Close WebSocket if still connected
                try:
                    if (
                        session.websocket
                        and session.websocket.client_state.name == "CONNECTED"
                    ):
                        await session.websocket.close()
                except Exception as e:
                    logger.debug(f"Failed to close WebSocket for user {user_id}: {e}")
            else:
                logger.warning(
                    f"❌ User {user_id} not found in sessions for {record_key}"
                )
        else:
            logger.warning(f"❌ Record {record_key} not found in active sessions")

    def end_edit_session_sync(
        self,
        user_id: int,
        record_type: str,
        record_id: int,
        content_id: Optional[int] = None,
    ):
        """Synchronous version of end_edit_session for REST API calls."""
        record_key = self._get_record_key(record_type, record_id, content_id)

        logger.info(
            f"SYNC: Attempting to end session for user {user_id} on {record_key}"
        )
        logger.info(
            f"SYNC: Current active sessions: {list(self.active_sessions.keys())}"
        )

        if record_key in self.active_sessions:
            logger.info(
                f"SYNC: Found record {record_key} with users: {list(self.active_sessions[record_key].keys())}"
            )

            if user_id in self.active_sessions[record_key]:
                session = self.active_sessions[record_key][user_id]
                del self.active_sessions[record_key][user_id]

                # Clean up empty record entries
                if not self.active_sessions[record_key]:
                    del self.active_sessions[record_key]

                logger.info(
                    f"✅ SYNC: Edit session ended: {session.username} stopped editing {record_key}"
                )
                logger.info(
                    f"SYNC: Remaining active sessions: {list(self.active_sessions.keys())}"
                )

                # Note: Don't try to close WebSocket here since this is synchronous
                # The WebSocket should already be closed by the client
            else:
                logger.warning(
                    f"❌ SYNC: User {user_id} not found in sessions for {record_key}"
                )
        else:
            logger.warning(f"❌ SYNC: Record {record_key} not found in active sessions")

    async def end_user_sessions(self, user_id: int):
        """End all edit sessions for a specific user."""
        sessions_to_remove = []

        for record_key, sessions in self.active_sessions.items():
            if user_id in sessions:
                sessions_to_remove.append((record_key, user_id))

        for record_key, user_id in sessions_to_remove:
            await self.end_edit_session(user_id, *self._parse_record_key(record_key))

    def _parse_record_key(self, record_key: str) -> tuple:
        """Parse record key back to components."""
        if "_content:" in record_key:
            parts = record_key.split(":")
            record_type = parts[0].replace("_content", "")
            record_id = int(parts[1])
            content_id = int(parts[2])
            return record_type, record_id, content_id
        else:
            parts = record_key.split(":")
            record_type = parts[0]
            record_id = int(parts[1])
            return record_type, record_id, None

    async def _notify_parallel_edit_detected(
        self, new_session: EditSession, existing_sessions: List[EditSession]
    ):
        """Notify existing and new users about parallel editing."""

        # Get all current editors (existing + new)
        all_current_sessions = existing_sessions + [new_session]

        # Sort by start time to determine the first user (who gets "acknowledge" option)
        all_sessions_sorted = sorted(all_current_sessions, key=lambda s: s.started_at)
        first_user = all_sessions_sorted[0] if all_sessions_sorted else None

        # Notify existing users about new editor and update their list
        for existing_session in existing_sessions:
            if existing_session.websocket:
                try:
                    # Send list of all other editors (excluding the recipient)
                    other_editors = [
                        {
                            "user_id": s.user_id,
                            "username": s.username,
                            "display_name": s.display_name,
                        }
                        for s in all_current_sessions
                        if s.user_id != existing_session.user_id
                    ]

                    # Determine if this existing user is the first one (should show acknowledge)
                    is_first_user = (
                        first_user and existing_session.user_id == first_user.user_id
                    )

                    await existing_session.websocket.send_text(
                        json.dumps(
                            {
                                "type": "parallel_edit_warning",
                                "message": f"WARNING: Parallel editing detected! {new_session.display_name or new_session.username} has joined the editing session.",
                                "new_editor": {
                                    "user_id": new_session.user_id,
                                    "username": new_session.username,
                                    "display_name": new_session.display_name,
                                },
                                "all_other_editors": other_editors,
                                "total_editors": len(all_current_sessions),
                                "is_first_user": is_first_user,
                                "is_new_editor": False,
                            }
                        )
                    )
                except Exception:
                    logger.warning(
                        f"Failed to notify user {existing_session.user_id} about parallel edit"
                    )

        # Notify new user about existing editors
        existing_editors = [
            {
                "user_id": s.user_id,
                "username": s.username,
                "display_name": s.display_name,
            }
            for s in existing_sessions
        ]

        if new_session.websocket:
            try:
                await new_session.websocket.send_text(
                    json.dumps(
                        {
                            "type": "parallel_edit_warning",
                            "message": f"WARNING: Parallel editing detected! Other users are editing this record.",
                            "existing_editors": existing_editors,
                            "all_other_editors": existing_editors,
                            "is_new_editor": True,
                            "is_first_user": False,  # New users are never the first user
                            "total_editors": len(all_current_sessions),
                        }
                    )
                )
            except Exception:
                logger.warning(
                    f"Failed to notify new user {new_session.user_id} about existing editors"
                )

    async def _notify_user_left(
        self, left_session: EditSession, remaining_sessions: List[EditSession]
    ):
        """Notify remaining users that someone has left the editing session."""

        if not remaining_sessions:
            return  # No one left to notify

        # Sort remaining sessions by start time to determine first user
        remaining_sorted = sorted(remaining_sessions, key=lambda s: s.started_at)
        first_user = remaining_sorted[0] if remaining_sorted else None

        # Notify each remaining user
        for remaining_session in remaining_sessions:
            if remaining_session.websocket:
                try:
                    # Create list of all OTHER remaining editors (excluding the recipient)
                    other_editors = [
                        {
                            "user_id": s.user_id,
                            "username": s.username,
                            "display_name": s.display_name,
                        }
                        for s in remaining_sessions
                        if s.user_id != remaining_session.user_id
                    ]

                    # Determine if this user is the first one
                    is_first_user = (
                        first_user and remaining_session.user_id == first_user.user_id
                    )

                    # If no other editors remain, clear the warning completely
                    if not other_editors:
                        await remaining_session.websocket.send_text(
                            json.dumps(
                                {
                                    "type": "user_left",
                                    "message": f"{left_session.display_name or left_session.username} has stopped editing.",
                                    "clear_warning": True,  # Signal to clear the parallel edit warning
                                    "left_user": {
                                        "user_id": left_session.user_id,
                                        "username": left_session.username,
                                        "display_name": left_session.display_name,
                                    },
                                }
                            )
                        )
                    else:
                        # Update the parallel edit warning with new editor list
                        await remaining_session.websocket.send_text(
                            json.dumps(
                                {
                                    "type": "parallel_edit_warning",
                                    "message": f"Updated: {left_session.display_name or left_session.username} has stopped editing.",
                                    "all_other_editors": other_editors,
                                    "total_editors": len(remaining_sessions),
                                    "is_first_user": is_first_user,
                                    "is_new_editor": False,
                                    "user_left": {
                                        "user_id": left_session.user_id,
                                        "username": left_session.username,
                                        "display_name": left_session.display_name,
                                    },
                                }
                            )
                        )

                except Exception:
                    logger.warning(
                        f"Failed to notify user {remaining_session.user_id} about user leaving"
                    )

    def get_active_editors(
        self, record_type: str, record_id: int, content_id: Optional[int] = None
    ) -> List[EditSession]:
        """Get list of users currently editing a specific record."""
        record_key = self._get_record_key(record_type, record_id, content_id)
        return list(self.active_sessions.get(record_key, {}).values())

    async def broadcast_to_editors(
        self,
        record_type: str,
        record_id: int,
        message: dict,
        content_id: Optional[int] = None,
        exclude_user_id: Optional[int] = None,
    ):
        """Broadcast a message to all users editing a specific record."""
        record_key = self._get_record_key(record_type, record_id, content_id)
        sessions = self.active_sessions.get(record_key, {})

        for user_id, session in sessions.items():
            if exclude_user_id and user_id == exclude_user_id:
                continue

            if session.websocket:
                try:
                    await session.websocket.send_text(json.dumps(message))
                except Exception:
                    logger.warning(f"Failed to broadcast message to user {user_id}")


# Global instance
edit_session_manager = EditSessionManager()
