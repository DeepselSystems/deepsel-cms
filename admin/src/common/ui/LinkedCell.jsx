import {Link} from 'react-router-dom';

export default function LinkedCell(props) {
  const {params, className, to, target, children, ...others} = props;
  return (
    <Link
      className={`whitespace-nowrap w-full h-full flex items-center ${className || ''}`}
      to={to || params?.row.id.toString()}
      target={target}
      {...others}
    >
      {children}
    </Link>
  );
}
