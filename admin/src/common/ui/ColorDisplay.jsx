export default function ColorDisplay({ color, value, className }) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className={`rounded-full w-5 h-5`} style={{ background: color }} />
      <div
        className="ml-1 leading-5"
        style={{
          color: `var(--_input-color)`,
          fontFamily: `var(--_input-font-family,var(--mantine-font-family))`,
          fontSize: `var(--_input-fz,var(--input-fz,var(--mantine-font-size-sm)))`,
        }}
      >
        {value || color}
      </div>
    </div>
  );
}
