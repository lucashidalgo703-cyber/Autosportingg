import Image from 'next/image';

export default function BuyerPortalBrand() {
    return <div className="flex flex-col items-center space-y-3 text-center">
        <Image src="/logo-header-final-user.png" alt="AutoSporting" width={866} height={180} className="mx-auto block h-auto w-56 max-w-full object-contain" priority />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">Portal del cliente</p>
    </div>;
}
