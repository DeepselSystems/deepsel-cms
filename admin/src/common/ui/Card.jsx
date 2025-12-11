export default function Card(props) {
  const {className, hoverEffect, ...other} = props;
  return (
    <div
      className={`bg-white rounded-xl border border-gray-300 shadow-lg cursor-auto p-[24px] ${
        className || ''
      }`}
      {...other}
    />
  );
}
