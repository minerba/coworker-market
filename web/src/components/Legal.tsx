// 약관/처리방침 화면 공통 서식
export function Legal({ children }: { children: React.ReactNode }) {
  return <article className="space-y-4 px-5 pb-12 text-[14px] leading-relaxed text-ink">{children}</article>;
}
export const H = ({ children }: { children: React.ReactNode }) => <h2 className="pt-3 text-base font-bold">{children}</h2>;
export const P = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;
export const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc space-y-1 pl-5">
    {items.map((t, i) => (
      <li key={i}>{t}</li>
    ))}
  </ul>
);
export const Notice = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-2xl bg-brand-soft px-4 py-3 text-[13px] leading-snug text-brand-dark">{children}</p>
);
