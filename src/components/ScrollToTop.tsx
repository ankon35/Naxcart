import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType !== 'POP') {
      const scrollContainer = document.querySelector('.h-screen.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTo(0, 0);
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [pathname, navigationType]);

  return null;
}
