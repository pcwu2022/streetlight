import { REGIONS } from '../../../lib/regions';
import { GameClient } from '../../../components/game/GameClient';

export function generateStaticParams() {
  return REGIONS.map((region) => ({
    regionId: region.id,
  }));
}

export default async function GamePage({ params }: { params: Promise<{ regionId: string }> }) {
  const { regionId } = await params;
  const region = REGIONS.find(r => r.id === regionId);
  
  return <GameClient regionId={regionId} region={region} />;
}
