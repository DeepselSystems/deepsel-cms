/**
 * Default image width
 */
export const IMAGE_WIDTH_DEFAULT = 300;

/**
 * Constants for enhanced image attributes and classes
 */
export const ENHANCED_IMAGE_ATTRIBUTES = {
  CONTAINER: "data-enhanced-image",
  DESCRIPTION: "data-description",
  ALIGNMENT: "data-alignment",
  ROUNDED: "data-rounded",
  CIRCLE: "data-circle",
  WIDTH: "data-width",
  HEIGHT: "data-height",
  INLINE: "data-inline",
} as const;

export const ENHANCED_IMAGE_CLASSES = {
  WRAPPER: "enhanced-image-wrapper",
  DESCRIPTION: "enhanced-image-description",
} as const;

/**
 * Constants for enhanced image alignment values
 */
export const ENHANCED_IMAGE_ALIGNMENTS = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
} as const;

/**
 * Check if content contains enhanced images
 * @param {HTMLElement} container - Container element to check
 * @returns {boolean} True if enhanced images are found
 */
export const containsEnhancedImages = (
  container: HTMLElement | null,
): boolean => {
  if (!container) return false;

  return (
    container.querySelector(`[${ENHANCED_IMAGE_ATTRIBUTES.CONTAINER}]`) !==
      null ||
    container.querySelector(`.${ENHANCED_IMAGE_CLASSES.WRAPPER}`) !== null
  );
};

/**
 * Initialize enhanced images functionality for a container
 * @param {HTMLElement} container - Container element with enhanced images
 */
export const initializeEnhancedImages = (
  container: HTMLElement | null,
): void => {
  if (!container) return;

  const enhancedImageWrappers = [
    ...Array.from(
      container.querySelectorAll(`[${ENHANCED_IMAGE_ATTRIBUTES.CONTAINER}]`),
    ),
    ...Array.from(
      container.querySelectorAll(`.${ENHANCED_IMAGE_CLASSES.WRAPPER}`),
    ),
  ];

  enhancedImageWrappers.forEach((wrapper) => {
    const isInline =
      wrapper.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.INLINE) === "true";

    const alignment = (wrapper.getAttribute(
      ENHANCED_IMAGE_ATTRIBUTES.ALIGNMENT,
    ) || ENHANCED_IMAGE_ALIGNMENTS.CENTER) as "left" | "right" | "center";

    if (isInline) {
      const inlineAlignmentStyles = {
        [ENHANCED_IMAGE_ALIGNMENTS.LEFT]:
          "display: inline-block !important; float: left !important; margin: 0 1rem 1rem 0 !important; width: fit-content !important;",
        [ENHANCED_IMAGE_ALIGNMENTS.RIGHT]:
          "display: inline-block !important; float: right !important; margin: 0 0 1rem 1rem !important; width: fit-content !important;",
        [ENHANCED_IMAGE_ALIGNMENTS.CENTER]:
          "display: inline-block !important; float: left !important; margin: 0 1rem 1rem 0 !important; width: fit-content !important;",
      };
      if (wrapper instanceof HTMLElement) {
        wrapper.style.cssText =
          inlineAlignmentStyles[alignment] ||
          inlineAlignmentStyles[ENHANCED_IMAGE_ALIGNMENTS.LEFT];
      }
    } else {
      const alignmentStyles = {
        [ENHANCED_IMAGE_ALIGNMENTS.CENTER]:
          "display: block !important; text-align: center !important; margin: 0 auto !important; width: fit-content !important;",
        [ENHANCED_IMAGE_ALIGNMENTS.LEFT]:
          "display: block !important; text-align: left !important; margin-left: 0 !important; margin-right: auto !important; width: fit-content !important;",
        [ENHANCED_IMAGE_ALIGNMENTS.RIGHT]:
          "display: block !important; text-align: right !important; margin-left: auto !important; margin-right: 0 !important; width: fit-content !important;",
      };
      if (wrapper instanceof HTMLElement) {
        wrapper.style.cssText =
          alignmentStyles[alignment] ||
          alignmentStyles[ENHANCED_IMAGE_ALIGNMENTS.CENTER];
      }
    }

    const img = wrapper.querySelector("img");
    const isCircle =
      wrapper.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.CIRCLE) === "true";
    const isRounded =
      wrapper.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.ROUNDED) !== "false";
    const dataWidth = wrapper.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.WIDTH);
    const dataHeight = wrapper.getAttribute(ENHANCED_IMAGE_ATTRIBUTES.HEIGHT);

    if (img && img instanceof HTMLImageElement) {
      if (isCircle) {
        img.style.borderRadius = "50%";
        img.style.aspectRatio = "1";
        img.style.objectFit = "cover";
      } else if (isRounded) {
        img.style.borderRadius = "6px";
      }

      if (dataWidth) {
        img.style.width = `${dataWidth}px`;
        img.setAttribute("width", dataWidth);
      }
      if (dataHeight) {
        img.style.height = `${dataHeight}px`;
        img.setAttribute("height", dataHeight);
      }
    }

    let description = wrapper.querySelector(
      `.${ENHANCED_IMAGE_CLASSES.DESCRIPTION}`,
    );

    if (!description) {
      const descriptionText = wrapper.getAttribute(
        ENHANCED_IMAGE_ATTRIBUTES.DESCRIPTION,
      );
      if (descriptionText && descriptionText.trim()) {
        description = document.createElement("div");
        description.className = ENHANCED_IMAGE_CLASSES.DESCRIPTION;
        description.textContent = descriptionText;
        wrapper.appendChild(description);
      }
    }

    if (description && description instanceof HTMLElement) {
      description.classList.add(
        "text-sm",
        "text-gray-600",
        "mt-2",
        "text-center",
      );
    }
  });
};
