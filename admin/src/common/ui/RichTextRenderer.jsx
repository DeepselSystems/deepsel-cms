import {useEffect, useRef} from 'react';
import {
  containsYouTubeJumpMarks,
  initializeYouTubeJumpMarks,
} from './tiptap-extensions/youtube-jumpmarks-extension/utils.js';
import {
  containsEnhancedImages,
  initializeEnhancedImages,
} from './tiptap-extensions/enhanced-image-extension/utils.js';

/**
 * A component that safely renders rich text content with nested components
 * while preserving the parent site's styling
 */
const RichTextRenderer = ({content, className = ''}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    // Set the HTML content
    containerRef.current.innerHTML = content;

    // Process all richtext containers to render their content properly
    processRichTextContainers(containerRef.current);

    // Initialize YouTube jump marks after content is rendered
    const hasYouTubeJumpMarks =
      containerRef.current.innerHTML &&
      containsYouTubeJumpMarks(containerRef.current.innerHTML);

    if (hasYouTubeJumpMarks) {
      initializeYouTubeJumpMarks(containerRef.current);
    }

    // Initialize enhanced images after content is rendered
    const hasEnhancedImages = containsEnhancedImages(containerRef.current);

    if (hasEnhancedImages) {
      initializeEnhancedImages(containerRef.current);
    }
  }, [content]);

  /**
   * Recursively process all richtext containers in the given element
   */
  const processRichTextContainers = (element) => {
    // Find all richtext containers
    const richtextContainers = element.querySelectorAll('.richtext-container');

    richtextContainers.forEach((container) => {
      const contentDiv = container.querySelector('.richtext-content');
      if (contentDiv) {
        // Get the HTML content and render it
        const htmlContent = contentDiv.textContent || contentDiv.innerText;
        if (htmlContent && htmlContent.trim().startsWith('<')) {
          // Set the HTML content
          contentDiv.innerHTML = htmlContent;

          // Process nested richtext containers recursively
          processRichTextContainers(contentDiv);
        }
      }
    });
  };

  return (
    <div ref={containerRef} className={`rich-text-content ${className}`} />
  );
};

export default RichTextRenderer;
