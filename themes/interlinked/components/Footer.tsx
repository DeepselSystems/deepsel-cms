export default function Footer({
  className,
  ...props
}: {
  className?: string;
}) {
  return (
    <footer
      className={`text-white bg-black border-t border-gray-200 py-6 text-center text-sm text-gray-500 ${className}`}
      {...props}
    >
      <p className="max-w-2xl mx-auto px-4">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </p>
    </footer>
  );
}
