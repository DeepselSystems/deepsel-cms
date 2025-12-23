export const highlightText = (text, searchInput) => {
  if (!searchInput || !text) return text;
  const parts = text.split(new RegExp(`(${searchInput})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === searchInput.toLowerCase() ? (
      <span key={index} className="bg-[yellow]">
        {part}
      </span>
    ) : (
      part
    ),
  );
};
