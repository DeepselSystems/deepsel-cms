import {useRef, useEffect} from 'react';

export default function IframeContent(props) {
  const {html, ...others} = props;
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentWindow.document;
      doc.open();
      // Add default Helvetica font styling to the content
      const styledHtml = `
        <style>
          body {
            font-family: Helvetica, Arial, sans-serif;
          }
        </style>
        ${html}
      `;
      doc.write(styledHtml);
      doc.close();
    }
  }, [html]);

  return <iframe ref={iframeRef} {...others} />;
}
