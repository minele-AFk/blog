"use client";

import { useTheme } from '../contexts/ThemeContext';
import Sakura from './Sakura';
import Meteor from './Meteor';

export default function BackgroundEffects() {
  const { theme } = useTheme();
  const isDayMode = theme === 'day';

  return (
    <>
      {/* 日照模式：樱花飘落 */}
      <div className={`transition-opacity duration-1000 ${isDayMode ? 'opacity-100' : 'opacity-0'}`}>
        <Sakura />
      </div>
      {/* 夜间模式：流星坠落 */}
      <div className={`transition-opacity duration-1000 ${isDayMode ? 'opacity-0' : 'opacity-100'}`}>
        <Meteor />
      </div>
    </>
  );
}
