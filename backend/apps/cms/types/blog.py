"""Type definitions for blog-related data structures"""

from typing import TypedDict, Optional, List, Dict, Any
from apps.cms.utils.shared_datatypes import SEOMetadata


class AuthorData(TypedDict, total=False):
    """Author data structure for blog posts"""

    id: int
    display_name: Optional[str]
    username: str
    image: Optional[str]


class LocaleData(TypedDict):
    """Locale data structure"""

    id: int
    name: str
    iso_code: str


class LanguageAlternative(TypedDict):
    """Language alternative structure"""

    slug: str
    locale: LocaleData


class BlogPostListItem(TypedDict, total=False):
    """Blog post list item structure"""

    id: int
    title: str
    slug: str
    excerpt: Optional[str]
    featured_image_id: Optional[int]
    publish_date: Optional[str]
    author: Optional[AuthorData]
    lang: str


class BlogPostData(TypedDict, total=False):
    """Complete blog post data structure"""

    id: int
    title: str
    content: Any
    lang: str
    public_settings: Dict[str, Any]
    seo_metadata: SEOMetadata
    custom_code: Optional[str]
    page_custom_code: Optional[str]
    require_login: Optional[bool]
    featured_image_id: Optional[int]
    publish_date: Optional[str]
    author: Optional[AuthorData]
    language_alternatives: List[LanguageAlternative]
