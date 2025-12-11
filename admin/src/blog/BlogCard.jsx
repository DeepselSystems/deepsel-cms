import BackendHostURLState from '../common/stores/BackendHostURLState.js';
import SitePublicSettingsState from '../common/stores/SitePublicSettingsState.js';
import {useTranslation} from 'react-i18next';
import {useMemo} from 'react';
import {Link} from 'react-router-dom';
import {getAttachmentUrl} from '../common/utils/index.js';

export default function BlogCard({post, size = 'md'}) {
  const {backendHost} = BackendHostURLState();
  const {settings: siteSettings} = SitePublicSettingsState();
  const {i18n} = useTranslation();
  const currentLang = i18n.language;

  // Find content matching the current selected language
  const content = useMemo(
    () =>
      post?.contents?.find(
        (content) => content.locale?.iso_code === currentLang
      ),
    [post, currentLang]
  );

  if (!content) return null;

  // Determine image height based on card size
  const imageHeightClass = {
    lg: 'h-[400px]',
    md: 'h-[300px]',
    sm: 'h-[240px]',
  }[size];

  const linkUrl = `/blog${post.slug}`;

  return (
    <Link to={linkUrl} className="block group" key={post.id}>
      <div className="bg-white overflow-hidden">
        {/* Featured Image (only shown if available) */}
        {content.featured_image && (
          <div className={`${imageHeightClass} overflow-hidden`}>
            <img
              src={getAttachmentUrl(backendHost, content.featured_image.name)}
              alt={content.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="py-4">
          <h2
            className={`${size === 'lg' ? 'text-4xl' : 'text-2xl'} font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-200`}
          >
            {content.title}
          </h2>
          {content.subtitle && (
            <p className="text-gray-600 mb-3">{content.subtitle}</p>
          )}
          <div className="flex items-center gap-3 text-gray-500 text-sm mt-3">
            {/* Show publication date if enabled in site settings */}
            {siteSettings?.show_post_date && <span>{formatDate(post)}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Format date to display like "Feb 28, 2023"
function formatDate(post) {
  // Use publish_date if available, otherwise fall back to created_at
  const dateToUse = post.publish_date || post.created_at;
  return new Date(dateToUse).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
