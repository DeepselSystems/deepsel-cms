export default function H2(props) {
  const { className, children, ...other } = props;
  return (
    <h2 className={`text-xl font-[700] text-primary-main ${className}`} {...other}>
      {children}
    </h2>
  );
}
