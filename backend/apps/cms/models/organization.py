from apps.core.models.organization import OrganizationModel
from sqlalchemy import Column, Integer, ForeignKey, JSON, Boolean, String, Text
from sqlalchemy.orm import relationship

from apps.cms.mixins.organization import CMSSettingsMixin


class CMSSettingsModel(CMSSettingsMixin, OrganizationModel):
    __table_args__ = {"extend_existing": True}

    # domain settings for multiple sites
    domains = Column(JSON, default=lambda: ["*"])

    # language settings
    available_languages = Column(JSON, default=list)
    default_language_id = Column(Integer, ForeignKey("locale.id"))
    default_language = relationship("LocaleModel", foreign_keys=[default_language_id])

    # auto-translate settings
    auto_translate_pages = Column(Boolean, default=False)
    auto_translate_posts = Column(Boolean, default=False)
    auto_translate_components = Column(Boolean, default=False)
    openai_api_key = Column(String(255), nullable=True)

    # blog settings
    show_post_author = Column(Boolean, default=True)
    show_post_date = Column(Boolean, default=True)
    blog_posts_per_page = Column(Integer, default=6)

    ai_translation_model_id = Column(Integer, ForeignKey("openrouter_model.id"))
    ai_translation_model = relationship(
        "OpenRouterModelModel", foreign_keys=[ai_translation_model_id]
    )

    ai_default_writing_model_id = Column(Integer, ForeignKey("openrouter_model.id"))
    ai_default_writing_model = relationship(
        "OpenRouterModelModel", foreign_keys=[ai_default_writing_model_id]
    )

    ai_autocomplete_model_id = Column(Integer, ForeignKey("openrouter_model.id"))
    ai_autocomplete_model = relationship(
        "OpenRouterModelModel", foreign_keys=[ai_autocomplete_model_id]
    )

    # chatbox settings
    show_chatbox = Column(Boolean, default=False)
    chatbox_model_id = Column(Integer, ForeignKey("openrouter_model.id"))
    chatbox_model = relationship(
        "OpenRouterModelModel", foreign_keys=[chatbox_model_id]
    )

    # custom code settings
    website_custom_code = Column(Text, nullable=True)

    # theme settings
    selected_theme = Column(String(255), nullable=True)
