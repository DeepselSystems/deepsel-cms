import {useState, useEffect} from 'react';

export default function WebsitePreviewTemplate() {
  const [templateData, setTemplateData] = useState(null);

  // Listen for template preview data from postMessage
  useEffect(() => {
    const handleMessage = (event) => {
      // console.log('WebsitePreviewTemplate: received message:', event.data);
      // Allow messages from parent window (different origin expected in iframe)
      if (event.data && event.data.type === 'TEMPLATE_PREVIEW_DATA') {
        // console.log(
        //   'WebsitePreviewTemplate: received template data =',
        //   event.data.data
        // );
        const data = event.data.data;
        setTemplateData(data);
      }
    };

    // Signal to parent that we're ready to receive messages
    const signalReady = () => {
      // console.log('WebsitePreviewTemplate: signaling ready to parent');
      if (window.parent && window.parent !== window) {
        // console.log('WebsitePreviewTemplate: sending IFRAME_READY message');
        window.parent.postMessage(
          {
            type: 'IFRAME_READY',
          },
          '*'
        );
      } else {
        console.log('WebsitePreviewTemplate: not in iframe, parent === window');
      }
    };

    window.addEventListener('message', handleMessage);

    // Signal ready after a small delay to ensure React app is fully initialized
    const readyTimeout = setTimeout(signalReady, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(readyTimeout);
    };
  }, []);

  // Determine what content to display
  const getDisplayContent = () => {
    if (!templateData) {
      return '<p>No content available</p>';
    }

    if (templateData.renderingError) {
      return `<div class="error-message" style="color: red; padding: 1rem; border: 1px solid red; border-radius: 4px;">
        <strong>Rendering Error:</strong><br/>
        ${templateData.renderingError}
      </div>`;
    }

    // Regular HTML content
    return templateData.content || '<p>No content available</p>';
  };

  return (
    <div
      className={`typography prose p-6 min-h-screen`}
      dangerouslySetInnerHTML={{
        __html: getDisplayContent(),
      }}
    />
  );
}
