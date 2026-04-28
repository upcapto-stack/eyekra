import Link from 'next/link';
import Image from 'next/image';

interface AppHeaderProps {
  title?: string;
  showLogo?: boolean;
  backHref?: string;
  right?: React.ReactNode;
}

export function AppHeader({ title, showLogo = true, backHref, right }: AppHeaderProps) {
  return (
    <header className="safe-top sticky top-0 z-10 bg-brand text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        {backHref ? (
          <Link href={backHref} className="shrink-0 text-sm font-semibold" aria-label="Back">
            Back
          </Link>
        ) : null}
        {showLogo ? (
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/eyekra-logo.png"
              alt="eyekra"
              width={80}
              height={80}
              className="object-contain w-auto h-auto"
              style={{ width: 'auto', height: 'auto' }}
            />
          </Link>
        ) : null}
        {title && !showLogo ? (
          <span className="font-semibold text-lg truncate">{title}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">{right}</div>
    </header>
  );
}
