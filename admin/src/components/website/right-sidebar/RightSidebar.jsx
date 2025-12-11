import ArrowRightHTML from '../icons/ArrowRightHTML.js';

export default function RightSidebar({content}) {
  // replace all ⇨ with ArrowRightHTML
  const processedContent = content
    ?.replace(/⇨/g, ArrowRightHTML())
    .replace(/→/g, ArrowRightHTML());

  return (
    <aside
      className="right-sidebar w-full sm:w-[350px] bg-gray-aqua-haze px-6 py-3"
      dangerouslySetInnerHTML={{__html: processedContent}}
    />
  );
}
