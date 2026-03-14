import dynamic from 'next/dynamic';

const DeathMapClient = dynamic(() => import('./DeathMapClient'), { ssr: false });

export default function MapPage() {
  return <DeathMapClient />;
}
