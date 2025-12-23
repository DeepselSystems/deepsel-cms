import Details from '@tiptap/extension-details';
import DetailsContent from '@tiptap/extension-details-content';
import DetailsSummary from '@tiptap/extension-details-summary';
import { Plugin, PluginKey } from 'prosemirror-state';
import { toggleDetailsWithAnimation } from './utils.js';
import { DETAILS_CLASSES } from './constants.js';

/**
 * Enhanced Details extension with smooth animation support
 * Extends the default TipTap Details extension with custom click handling
 */
const EnhancedDetails = Details.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      persist: true,
      HTMLAttributes: {
        class: DETAILS_CLASSES.WRAPPER,
      },
    };
  },

  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() || [];

    return [
      ...parentPlugins,
      new Plugin({
        key: new PluginKey('detailsAnimationPlugin'),
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              // Handle summary clicks to toggle details with smooth animation
              if (event.target.tagName === 'SUMMARY') {
                // Look for both native details and TipTap's div structure
                const detailsElement =
                  event.target.closest('details') ||
                  event.target.closest(`.${DETAILS_CLASSES.WRAPPER}`);

                if (detailsElement) {
                  // Prevent ProseMirror from handling this event
                  event.preventDefault();
                  event.stopPropagation();

                  // Find the content div
                  const contentDiv = detailsElement.querySelector(
                    'div[data-type="detailsContent"]',
                  );

                  if (contentDiv) {
                    toggleDetailsWithAnimation(detailsElement, contentDiv);
                  }

                  return true;
                }
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});

export { EnhancedDetails, DetailsContent, DetailsSummary };
