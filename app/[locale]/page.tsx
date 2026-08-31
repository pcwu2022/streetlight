import { notFound } from 'next/navigation';
import { LocaleRegionBrowser } from '../../components/gallery/LocaleRegionBrowser';
import { GameLocale } from '../../types';
import { isLocale } from '../../lib/regions';

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'tw' }];
}

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <LocaleRegionBrowser locale={locale as GameLocale} />;
}
