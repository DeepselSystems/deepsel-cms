import {useEffect, useMemo} from 'react';
import PropTypes from 'prop-types';
import SitePublicSettingsState from '../../common/stores/SitePublicSettingsState.js';
import HydrateServerComponents from './HydrateServerComponents.jsx';

export default function SpecialTemplateRenderer({
  templateKey = 'not_found',
  siteSettingsOverride = null,
  fallback = null,
}) {
  const {settings, setSettings} = SitePublicSettingsState();

  // Sync incoming settings with store so other consumers stay consistent
  useEffect(() => {
    if (siteSettingsOverride && siteSettingsOverride !== settings) {
      setSettings(siteSettingsOverride);
    }
  }, [siteSettingsOverride, settings, setSettings]);

  const siteSettings = useMemo(
    () => siteSettingsOverride || settings,
    [siteSettingsOverride, settings]
  );

  const normalizedKey =
    typeof templateKey === 'string' ? templateKey : String(templateKey || '');
  const loweredKey = normalizedKey.toLowerCase();

  const templateEntryRaw =
    siteSettings?.special_templates?.[normalizedKey] ||
    siteSettings?.special_templates?.[loweredKey] ||
    null;

  const templateEntry = useMemo(() => {
    if (!templateEntryRaw) return null;
    if (typeof templateEntryRaw === 'string') {
      return {name: templateEntryRaw};
    }
    return templateEntryRaw;
  }, [templateEntryRaw]);

  const templateName = templateEntry?.component_name || templateEntry?.name;
  const renderedHtml = templateEntry?.html;

  if (!templateEntry || (!renderedHtml && !templateName)) {
    if (fallback) return fallback;
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Page not found</h1>
          <p className="text-gray-600">
            The requested page could not be located.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {renderedHtml ? (
        <div
          className="special-template-html"
          dangerouslySetInnerHTML={{__html: renderedHtml}}
        />
      ) : (
        <div data-react-component={templateName} />
      )}
      <HydrateServerComponents
        siteSettings={siteSettings}
        isNewNavigation={true}
      />
    </>
  );
}

SpecialTemplateRenderer.propTypes = {
  templateKey: PropTypes.string,
  siteSettingsOverride: PropTypes.object,
  fallback: PropTypes.node,
};
