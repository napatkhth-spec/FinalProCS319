import { Link } from 'react-router';
import { ArrowRight, Sprout } from 'lucide-react';

export function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
          <Sprout size={16} />
          จากชุมชน ส่งตรงถึงบ้าน
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight text-green-950 md:text-6xl">
          ผลผลิตสดใหม่
          <br />
          จากเกษตรกรใกล้คุณ
        </h1>
        <p className="mt-5 max-w-xl text-lg text-stone-600">
          ค้นพบผัก ผลไม้ และสินค้าเกษตรคุณภาพ พร้อมสนับสนุนเกษตรกรในชุมชนโดยตรง
        </p>
        <Link
          to="/products"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
        >
          เลือกซื้อสินค้า <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
