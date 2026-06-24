import ChildSectionNav from "./ChildSectionNav";

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChildSectionNav />
    </>
  );
}
