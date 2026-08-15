'use client';

import { usePathname } from 'next/navigation';
import BackgroundRotator from './BackgroundRotator';

export default function RouteWatcher() {
  const pathname = usePathname();
  
  return <BackgroundRotator routeKey={pathname} />;
}
