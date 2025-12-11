import {useState, useEffect} from 'react';
import backendHost from '../../constants/backendHost';
import i18n from 'i18next';

export default function ServerComponent({name}) {
  const [Cmp, setCmp] = useState(null);
  const currentLang = i18n.language;

  useEffect(() => {
    import(
      /* @vite-ignore */ `${backendHost}/template/jsx/${currentLang}/${name}`
    ).then((m) => setCmp(() => m.default));
  }, [name, currentLang]);

  return Cmp ? <Cmp /> : <div></div>;
}
