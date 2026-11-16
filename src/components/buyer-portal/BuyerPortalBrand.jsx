import Image from 'next/image';

export default function BuyerPortalBrand() {
    return <div className="space-y-3">
        <Image src="/logo-header-final-user.png" alt="AutoSporting" width={866} height={180} className="h-auto w-56 max-w-full object-contain" priority />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">Portal del cliente</p>
    </div>;
}
