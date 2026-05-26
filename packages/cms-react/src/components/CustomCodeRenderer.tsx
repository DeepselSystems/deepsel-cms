import React, { useEffect, useRef } from 'react';
import { useWebsiteData } from '../contexts';

/** Content types supported by CustomCodeRenderer */
export type CustomCodeContentType = 'page' | 'blog_post' | 'blog_list' | 'search_result' | 'form';

export interface CustomCodeRendererProps {
  /** Page, blog post or form data object */
  pageData?: Record<string, unknown> | null;
  /** Language-specific content data */
  contentData?: Record<string, unknown> | null;
  /** Type of content being rendered */
  type: CustomCodeContentType;
  /** Whether the page is in preview mode — custom code is disabled for security */
  isPreviewMode?: boolean;
}

/**
 * Renders custom HTML/JS code blocks in the correct priority order:
 * language-specific → all-language → site-wide.
 * Skips all execution in preview mode for security.
 */
export function CustomCodeRenderer({
  pageData,
  contentData,
  type,
  isPreviewMode = false,
}: CustomCodeRendererProps) {
  const { websiteData } = useWebsiteData();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let executed = false;

    if (isPreviewMode || !containerRef.current) {
      return;
    }

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

            if (script.src) {
              newScript.src = script.src;
              newScript.async = true;
            } else {
              newScript.innerHTML = script.innerHTML;
            }

            newScript.onerror = (error) => {
              console.warn('Custom code script error:', error);
            };

            script.parentNode?.replaceChild(newScript, script);
          } catch (scriptError) {
            console.warn('Error executing custom code script:', scriptError);
          }
        }, index * 10);
      });
    };

    if (window.requestIdleCallback) {
      window.requestIdleCallback(executeScripts, { timeout: 1000 });
    } else {
      setTimeout(executeScripts, 0);
    }

    return () => {
      executed = true;
    };
  }, [isPreviewMode, pageData, contentData, websiteData.settings, type]);

  if (isPreviewMode) {
    return null;
  }

  const codesToRender: { code: string; source: string }[] = [];

  // 1. Language-specific custom code — not for blog list or search result
  if (
    type !== 'blog_list' &&
    type !== 'search_result' &&
    contentData?.custom_code
  ) {
    codesToRender.push({
      code: contentData.custom_code as string,
      source: 'language_specific',
    });
  }

  // 2. All-language custom code per content type — not for blog list or search result
  if (type === 'page' && pageData?.page_custom_code) {
    codesToRender.push({
      code: pageData.page_custom_code as string,
      source: 'page_all_langs',
    });
  } else if (type === 'blog_post' && pageData?.blog_post_custom_code) {
    codesToRender.push({
      code: pageData.blog_post_custom_code as string,
      source: 'blog_post_all_langs',
    });
  } else if (type === 'form' && pageData?.form_custom_code) {
    codesToRender.push({
      code: pageData.form_custom_code as string,
      source: 'form_all_langs',
    });
  }

  // 3. Site-wide custom code from public settings
  if (websiteData.settings?.website_custom_code) {
    codesToRender.push({
      code: websiteData.settings.website_custom_code,
      source: 'website',
    });
  }

  if (codesToRender.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="custom-code-content">
      {codesToRender.map(({ code, source }, index) => {
        if (!code || !code.trim()) return null;

        return (
          <div
            key={`${source}-${index}`}
            data-custom-code-source={source}
            data-custom-code-index={index}
            dangerouslySetInnerHTML={{ __html: code }}
          />
        );
      })}
    </div>
  );
}
