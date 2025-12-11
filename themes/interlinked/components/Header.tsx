import Menu from './Menu.tsx';
import LangSwitcher from './LangSwitcher.tsx';
import reactLogo from '../react.svg';


export default function Header() {
  return (
    <header className="shadow px-3 sticky top-0 z-50 backdrop-blur bg-white/90">
      <div className="flex justify-between items-center gap-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-2xl font-bold text-primary-600">
          <img
            src={reactLogo.src}
            alt="React logo"
            className="h-8 w-8"
          />
          <span>React Starter Theme</span>
        </div>
        <div className="flex items-center gap-6">
          <Menu />
          <LangSwitcher />
        </div>
      </div>
    </header>
  );
}
