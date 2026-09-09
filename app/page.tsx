'use client';

import { useEffect, useState } from 'react';
import type { RawItem } from '@/lib/types';
import { Masthead } from './_components/Masthead';
import { GazetteBoard, Ticker } from './_components/GazetteBoard';

export default function Home() {
  const [items, setItems] = useState<RawItem[]>([]);

  useEffect(() => {
    const load = () =>
      fetch('/api/items?limit=40')
        .then((r) => r.json())
        .then((d) => d.ok && setItems(d.items))
        .catch(() => {});
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Masthead />
      <Ticker items={items} />
      <main className="page">
        <GazetteBoard />
      </main>
    </>
  );
}
