import pytest
from sqlalchemy.orm import Session

from apps.cms import set_default_theme_if_empty
from apps.cms.models.organization import CMSSettingsModel


def test_set_default_theme_if_empty(db: Session):
    """Test that set_default_theme_if_empty sets starter_react for orgs without a theme."""
    org = CMSSettingsModel(name="Test Org")
    db.add(org)
    db.commit()

    assert org.selected_theme is None  # nosec B101

    set_default_theme_if_empty(db)

    db.refresh(org)
    assert org.selected_theme == "starter_react"  # nosec B101


def test_set_default_theme_does_not_overwrite(db: Session):
    """Test that set_default_theme_if_empty does not overwrite an existing theme."""
    org = CMSSettingsModel(name="Test Org 2")
    org.selected_theme = "custom_theme"
    db.add(org)
    db.commit()

    set_default_theme_if_empty(db)

    db.refresh(org)
    assert org.selected_theme == "custom_theme"  # nosec B101
