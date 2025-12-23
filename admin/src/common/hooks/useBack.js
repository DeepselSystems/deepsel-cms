import { useLocation, useNavigate } from 'react-router-dom';

export default function useBack() {
  const location = useLocation();
  const navigate = useNavigate();

  function back() {
    if (history.length > 1) {
      navigate(-1);
    } else {
      const currentPath = location.pathname;
      const pathSegments = currentPath.split('/');
      pathSegments.pop();
      const newPath = pathSegments.join('/') || '/';
      navigate(newPath);
    }
  }

  return { back };
}
