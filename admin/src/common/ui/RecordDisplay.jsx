import {Link} from 'react-router-dom';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowRight} from '@fortawesome/free-solid-svg-icons';

export default function RecordDisplay({
  label,
  value,
  linkTo,
  children,
  size = 'md',
  ...others
} = {}) {
  return (
    <div {...others}>
      <div
        style={{
          fontSize: `var(--input-label-size,var(--mantine-font-size-${size}))`,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <Link
        to={linkTo}
        className="cursor-pointer text-primary-main"
        style={{
          fontSize: `var(--mantine-font-size-${size})`,
        }}
      >
        {children || value}
        {(children || value) && (
          <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
        )}
      </Link>
    </div>
  );
}
