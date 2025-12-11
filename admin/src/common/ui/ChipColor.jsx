export default function ChipColor({className, color, children}) {
  return (
    <div
      className={`leading-5 rounded-3xl p-1 text-center ${className}`}
      style={{
        background: color,
        color: `var(--_input-color)`,
        fontFamily: `var(--_input-font-family,var(--mantine-font-family))`,
        fontSize: `var(--_input-fz,var(--input-fz,var(--mantine-font-size-sm)))`,
      }}
    >
      {children || color}
    </div>
  );
}
