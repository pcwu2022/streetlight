import { notFound } from 'next/navigation';
import { GameClient } from '../../../../components/game/GameClient';
import { getRegionsForLocale, isLocale } from '../../../../lib/regions';

export function generateStaticParams() {
  return [
    ...getRegionsForLocale('en').map((region) => ({ locale: 'en', regionId: region.id })),
    ...getRegionsForLocale('tw').map((region) => ({ locale: 'tw', regionId: region.id })),
  ];
}

export default async function LocaleGamePage({ params }: { params: Promise<{ locale: string; regionId: string }> }) {
  const { locale, regionId } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const region = getRegionsForLocale(locale).find((item) => item.id === regionId);
  return <GameClient regionId={regionId} region={region} />;
}
