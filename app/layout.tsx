import type { Metadata } from 'next';
import Navbar from '../components/Navbar';
import MotionWrapper from '../components/MotionWrapper';
import ParticleBackground from '../components/ParticleBackground';
import BackToTop from '../components/BackToTop';
import RouteWatcher from '../components/RouteWatcher';
import { ThemeProvider } from '../contexts/ThemeContext';
import { MusicProvider } from '../components/MusicProvider';
import BackgroundEffects from '../components/BackgroundEffects';
import { getSiteUrl } from '@/lib/site';
import './globals.css';

// 站点域名：部署时通过 NEXT_PUBLIC_SITE_URL 配置，用于生成 OpenGraph 等绝对 URL
// getSiteUrl 会校验 env 格式并安全降级，未配置/无协议时不会导致构建失败
const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  title: '戏子多秋 - 在代码与学术间穿梭',
  description: '在代码、学术与分子动力学模拟间穿梭的普通人。近期正埋头于 GROMACS 模拟研究与神经网络计算。',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '戏子多秋 - 在代码与学术间穿梭',
    description: '在代码、学术与分子动力学模拟间穿梭的普通人。近期正埋头于 GROMACS 模拟研究与神经网络计算。',
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    siteName: '戏子多秋の小站',
    images: [
      {
        url: '/background/anime-night.png',
        width: 800,
        height: 450,
        alt: '戏子多秋の小站',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '戏子多秋 - 在代码与学术间穿梭',
    description: '在代码、学术与分子动力学模拟间穿梭的普通人。近期正埋头于 GROMACS 模拟研究与神经网络计算。',
    images: ['/background/anime-night.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body className="min-h-screen relative">
        <ThemeProvider>
          <MusicProvider>
            <RouteWatcher />
            
            <ParticleBackground />
            
            <BackgroundEffects />
            
            <Navbar />
            
            <main className="pt-16 pb-12 relative z-10">
              <MotionWrapper>
                {children}
              </MotionWrapper>
            </main>

            <BackToTop />
          </MusicProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
