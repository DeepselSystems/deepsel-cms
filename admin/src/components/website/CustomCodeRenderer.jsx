import {useEffect, useRef} from 'react';
import SitePublicSettingsState from '../../common/stores/SitePublicSettingsState.js';

/**
 * CustomCodeRenderer component that renders custom code inline after content
 * @param {Object} props
 * @param {Object} props.pageData - Page, blog post or form data
 * @param {Object} props.contentData - The specific content data (language-specific)
 * @param {string} props.type - Type of content ('page', 'blog_post', 'blog_list', 'search_result', or 'form')
 * @param {boolean} props.isPreviewMode - Whether the page is in preview mode (custom code disabled for security)
 */
export default function CustomCodeRenderer({
  pageData,
  contentData,
  type,
  isPreviewMode = false,
}) {
  const {settings: siteSettings} = SitePublicSettingsState();
  const containerRef = useRef(null);

  useEffect(() => {
    let executed = false;

    // Skip custom code execution in preview mode for security
    if (isPreviewMode || !containerRef.current) {
      return;
    }

    // Execute scripts asynchronously to avoid blocking
    const executeScripts = () => {
      if (executed) return;
      executed = true;

      const container = containerRef.current;
      if (!container) return;

      const scripts = container.getElementsByTagName('script');
      Array.from(scripts).forEach((script, index) => {
        setTimeout(() => {
          try {
            const newScript = document.createElement('script');
            Array.from(script.attributes).forEach((attr) => {
              newScript.setAttribute(attr.name, attr.value);
            });

            // Handle both inline scripts and external scripts
            if (script.src) {
              newScript.src = script.src;
              newScript.async = true; // Make external scripts async
            } else {
              newScript.innerHTML = script.innerHTML;
            }

            // Add error handling for script execution
            newScript.onerror = (error) => {
              console.warn(`Custom code script error:`, error);
            };

            script.parentNode.replaceChild(newScript, script);
          } catch (scriptError) {
            console.warn(`Error executing custom code script:`, scriptError);
          }
        }, index * 10); // Small delay between scripts to prevent blocking
      });
    };

    // Use requestIdleCallback for better performance
    if (window.requestIdleCallback) {
      window.requestIdleCallback(executeScripts, {timeout: 1000});
    } else {
      setTimeout(executeScripts, 0);
    }

    return () => {
      executed = true; // Prevent execution on cleanup
    };
  }, [isPreviewMode, pageData, contentData, siteSettings, type]);

  // Skip rendering in preview mode for security
  if (isPreviewMode) {
    return null;
  }

  // Collect all custom code to render in correct order: lang specific -> all lang -> site
  const codesToRender = [];

  // 1. Language-specific custom code - not for blog list or search result
  if (
    type !== 'blog_list' &&
    type !== 'search_result' &&
    contentData?.custom_code
  ) {
    codesToRender.push({
      code: contentData.custom_code,
      source: 'language_specific',
    });
  }

  // 2. Page/Blog post/Form custom code (all languages) - not for blog list or search result
  if (type === 'page' && pageData?.page_custom_code) {
    codesToRender.push({
      code: pageData.page_custom_code,
      source: 'page_all_langs',
    });
  } else if (type === 'blog_post' && pageData?.blog_post_custom_code) {
    codesToRender.push({
      code: pageData.blog_post_custom_code,
      source: 'blog_post_all_langs',
    });
  } else if (type === 'form' && pageData?.form_custom_code) {
    codesToRender.push({
      code: pageData.form_custom_code,
      source: 'form_all_langs',
    });
  }

  // 3. Site-wide custom code (from site settings)
  if (siteSettings?.website_custom_code) {
    codesToRender.push({
      code: siteSettings.website_custom_code,
      source: 'website',
    });
  }

  // If no code to render, return null
  if (codesToRender.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="custom-code-content">
      {codesToRender.map(({code, source}, index) => {
        if (!code || !code.trim()) return null;

        return (
          <div
            key={`${source}-${index}`}
            data-custom-code-source={source}
            data-custom-code-index={index}
            dangerouslySetInnerHTML={{__html: code}}
          />
        );
      })}
    </div>
  );
}
