import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import bridgeVendors from '../../utils/host-bridge.js';

function autoImport() {
  // Assign all external libraries to window
  console.log('Bridging vendor libraries');
  bridgeVendors();

  // Define folders to import from
  const allModules = {
    ...import.meta.glob('../../common/**/*.{js,jsx}', {eager: true}),
    ...import.meta.glob('../../constants/**/*.{js,jsx}', {eager: true}),
    ...import.meta.glob('../../utils/**/*.{js,jsx}', {eager: true}),
  };

  console.log(`Assigning ${Object.keys(allModules).length} modules`);
  // Process all modules
  for (const [path, mod] of Object.entries(allModules)) {
    const fileName = path
      .split('/')
      .pop()
      .replace(/\.(js|jsx)$/, '');

    // If there's a default export, expose it
    if (mod.default) {
      let exportName =
        mod.default.name || mod.default.displayName || mod.default.type?.name;

      // if a zustand store, use the filename
      if (exportName == 'useBoundStore') {
        exportName = fileName;
      }

      // if not a named export, use the filename
      if (exportName == 'default' || !exportName) {
        exportName = fileName;
      }

      if (!window[exportName]) {
        // Assign name to window, if not assigned already
        window[exportName] = mod.default;
        // console.log('Assigned default export', exportName, mod.default);
      }
    }

    // Expose all named exports individually
    for (const [exportName, value] of Object.entries(mod)) {
      if (exportName === 'default') continue;

      if (!window[exportName]) {
        // Assign name to window, if not assigned already
        window[exportName] = value;
        // console.log('Assigned named export', exportName, value);
      }
    }
  }
}

function HydrateServerComponents(props) {
  const {siteSettings, isNewNavigation, extraCode} = props;
  const [components, setComponents] = useState([]);

  useEffect(() => {
    // Clear existing components first to prevent rendering to stale DOM elements
    setComponents([]);

    const hydrateComponents = () => {
      const placeholders = document.querySelectorAll('[data-react-component]');

      if (placeholders.length === 0) {
        return;
      }

      console.log('Hydrating components');

      // load common libraries
      autoImport();

      // Phase 1: Get all React component code from siteSettings
      const reactComponents = siteSettings?.react_components || {};

      if (Object.keys(reactComponents).length > 0 || extraCode) {
        // Phase 1b: Evaluate all components in one scope so they can reference each other
        try {
          let allCode = Object.values(reactComponents).join('\n\n');
          // console.log('allCode0', allCode);
          // Append extraCode if provided
          if (extraCode) {
            allCode += '\n\n' + extraCode;
          }

          // Use (0, eval) to force global scope
          (0, eval)(allCode);
        } catch (err) {
          console.error('Failed to eval components:', err);
        }
      }

      // Phase 2: Now render all components (they can reference each other)
      const componentData = [];
      Array.from(placeholders).forEach((el) => {
        const name = el.getAttribute('data-react-component');
        if (!name) return;

        try {
          const Cmp = eval(name);
          if (Cmp) {
            componentData.push({
              element: el,
              Component: Cmp,
              name: name,
            });
          }
        } catch (e) {
          console.error(`Component evaluation failed: ${name}`, e);
        }
      });

      setComponents(componentData);
    };

    // Use a small delay to ensure the new page content is fully rendered
    const timer = setTimeout(hydrateComponents, 100);

    // Set up MutationObserver to detect when new placeholders are added
    const observer = new MutationObserver((mutations) => {
      let shouldRehydrate = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node or its children have data-react-component
              if (
                node.getAttribute?.('data-react-component') ||
                node.querySelector?.('[data-react-component]')
              ) {
                shouldRehydrate = true;
              }
            }
          });
        }
      });

      if (shouldRehydrate) {
        setTimeout(hydrateComponents, 50); // Small delay to ensure DOM is stable
      }
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [siteSettings, isNewNavigation, extraCode]);

  return (
    <>
      {components.map(({element, Component, name}) => {
        // Check if the element still exists in the DOM and is connected
        if (document.contains(element) && element.isConnected) {
          try {
            return createPortal(<Component />, element, name);
          } catch (error) {
            console.error(`Failed to render component ${name}:`, error);
            return null;
          }
        }
        return null;
      })}
    </>
  );
}

export default HydrateServerComponents;
