import itertools
import asyncio
from asyncio import sleep
from typing import Optional
from sqlalchemy import Column, Integer, String, Text
from db import Base
from apps.deepsel.mixins.base_model import BaseModel
from pydantic import EmailStr
from sqlalchemy.orm import Session
from jinja2 import Template
import logging
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

from apps.deepsel.models.organization import OrganizationModel
from apps.deepsel.utils.models_pool import models_pool
from apps.deepsel.utils.send_email import send_email_with_limit, EmailRateLimitError

logger = logging.getLogger(__name__)


class EmailTemplateModel(Base, BaseModel):
    __tablename__ = "email_template"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False, default="")
    content = Column(Text, nullable=False)

    async def send(
        self,
        db: Session,
        to: list[EmailStr],
        context: dict,
        subject: Optional[str] = None,
    ) -> bool:
        try:
            # Prepare email content using templates
            template = Template(self.content)
            rendered_template = template.render(**context)

            subject_template = Template(self.subject)
            rendered_subject = subject_template.render(**context)

            final_subject = subject or rendered_subject

            # Use the unified email sending function with rate limiting
            result = await send_email_with_limit(
                db=db,
                to=to,
                subject=final_subject,
                content=rendered_template,
                organization_id=self.organization_id,
                content_type="html",
                template_context=context,
            )

            return result["success"]

        except EmailRateLimitError as e:
            logger.warning(f"Email template send rate limited: {e}")
            return False
        except Exception as e:
            logger.error(f"Error sending email template: {e}")
            return False

    @classmethod
    async def send_common_notify_to_user_roles(
        cls,
        db: Session,
        to_user_has_roles: list[str],
        subject: str,
        text: str,
        btn_text: str,
        action_url: str,
    ):
        print("send_common_notify_to_user_roles")
        UserModel = models_pool["user"]
        Model = models_pool[cls.__tablename__]
        to_users = UserModel.get_user_has_roles(to_user_has_roles, db)
        if not to_users:
            return
        to_emails = [user.email for user in to_users if user.email]
        if not to_emails:
            return
        common_notify_template = (
            db.query(Model).filter(Model.string_id == "common_notify_template").one()
        )
        if not common_notify_template:
            logger.info("The common_notify_template doesn't exist")
            return

        context = {"text": text, "cta_action_url": action_url, "cta_btn_text": btn_text}
        return await common_notify_template.send(
            db=db,
            to=[EmailStr._validate(email) for email in list(set(to_emails))],
            context=context,
            subject=subject,
        )

    @classmethod
    async def find_good_config(
        cls, db: Session, test_recipient: EmailStr = "dev@deepsel.com", sleep_interval=0
    ) -> str:
        """
        Test all combinations of the 4 boolean configs with a delay to prevent overload.
        """
        options = [True, False]
        combinations = list(itertools.product(options, repeat=4))
        logger.info(f"Testing {len(combinations)} combinations")

        results = []
        for combination in combinations:
            MAIL_SSL_TLS, MAIL_STARTTLS, USE_CREDENTIALS, VALIDATE_CERTS = combination
            result = await cls.test_config(
                db=db,
                test_recipient=test_recipient,
                MAIL_SSL_TLS=MAIL_SSL_TLS,
                MAIL_STARTTLS=MAIL_STARTTLS,
                USE_CREDENTIALS=USE_CREDENTIALS,
                VALIDATE_CERTS=VALIDATE_CERTS,
            )
            results.append(result)
            await sleep(sleep_interval)

        logger.info(f"Found {len(results)} results")
        return "\n\n".join(results)

    @staticmethod
    async def test_config(
        db: Session,
        test_recipient: EmailStr,
        MAIL_SSL_TLS: bool,
        MAIL_STARTTLS: bool,
        USE_CREDENTIALS: bool,
        VALIDATE_CERTS: bool,
    ) -> str:
        """
        Test the given configuration using direct FastMail (bypasses rate limiting for testing)
        """
        super_org = db.query(OrganizationModel).filter_by(string_id="1").first()
        try:
            message = MessageSchema(
                subject="SMTP Configuration Test",
                recipients=[test_recipient],
                body=f"Configuration test: MAIL_SSL_TLS={MAIL_SSL_TLS}, MAIL_STARTTLS={MAIL_STARTTLS}, USE_CREDENTIALS={USE_CREDENTIALS}, VALIDATE_CERTS={VALIDATE_CERTS}",
                subtype=MessageType.html,
            )
            conf = ConnectionConfig(
                MAIL_USERNAME=super_org.mail_username,
                MAIL_PASSWORD=super_org.mail_password,
                MAIL_FROM=super_org.mail_from,
                MAIL_FROM_NAME=super_org.mail_from_name,
                MAIL_PORT=int(super_org.mail_port),
                MAIL_SERVER=super_org.mail_server,
                MAIL_SSL_TLS=MAIL_SSL_TLS,
                MAIL_STARTTLS=MAIL_STARTTLS,
                USE_CREDENTIALS=USE_CREDENTIALS,
                VALIDATE_CERTS=VALIDATE_CERTS,
                TIMEOUT=super_org.mail_timeout,
            )
            fm = FastMail(conf)
            await fm.send_message(message)
            logger.info(f"SMTP configuration test successful to {test_recipient}")
            return f"\n✅ Successful configuration: MAIL_SSL_TLS={MAIL_SSL_TLS}, MAIL_STARTTLS={MAIL_STARTTLS}, USE_CREDENTIALS={USE_CREDENTIALS}, VALIDATE_CERTS={VALIDATE_CERTS}"
        except Exception as e:
            return f"\n❌ Failed configuration: MAIL_SSL_TLS={MAIL_SSL_TLS}, MAIL_STARTTLS={MAIL_STARTTLS}, USE_CREDENTIALS={USE_CREDENTIALS}, VALIDATE_CERTS={VALIDATE_CERTS}. Error: {e}"
