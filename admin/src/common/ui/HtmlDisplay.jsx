import {useEffect, useState} from 'react';

export default function HtmlDisplay({
  content,
  className = '',
  width = '100%',
  height = '500px',
}) {
  const [iframeSrc, setIframeSrc] = useState('');

  useEffect(() => {
    if (!content) {
      setIframeSrc(null);
      return;
    }
    const blob = new Blob([content], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    setIframeSrc(url);
  }, [content]);

  return (
    <div className={className}>
      {iframeSrc && <iframe src={iframeSrc} width={width} height={height} />}
    </div>
  );
}
