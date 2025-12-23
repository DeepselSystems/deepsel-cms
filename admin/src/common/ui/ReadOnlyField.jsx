export default function ReadOnlyField(props) {
  const {
    label,
    value,
    description,
    className,
    children,
    size = 'md',
    renderIfEmpty = true,
    ...other
  } = props;

  if (!renderIfEmpty && !value && !children) {
    return null;
  }

  return (
    <div className={`${className}`} {...other}>
      <div
        style={{
          fontSize: `var(--input-label-size,var(--mantine-font-size-${size}))`,
          fontWeight: 500,
        }}
      >
        {label}
      </div>

      <p
        style={{
          color: `var(--mantine-color-dimmed)`,
          fontSize: `var(--input-description-size,calc(var(--mantine-font-size-${size}) - .125rem*var(--mantine-scale)))`,
        }}
      >
        {description}
      </p>

      <div
        style={{
          color: `var(--_input-color)`,
          fontFamily: `var(--_input-font-family,var(--mantine-font-family))`,
          fontSize: `var(--_input-fz,var(--input-fz,var(--mantine-font-size-md)))`,
          height: `var(--_input-size)`,
          lineHeight: `var(--_input-line-height)`,
          minHeight: `var(--_input-height)`,
          width: `100%`,
        }}
      >
        {children || value || (
          <span className={`text-gray-500 text-4xl leading-[0.8] font-[100]`}>-</span>
        )}
      </div>
    </div>
  );
}
