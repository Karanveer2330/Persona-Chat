
import { Network } from 'lucide-react';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/chat/global" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
      <Network className="h-7 w-7" />
      <h1 className="text-2xl font-bold font-headline">Hub</h1>
    </Link>
  );
}
