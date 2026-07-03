import "./child-simplified.css";
import "./child-dashboard-v3.css";
import "./child-layout-cleanup.css";
import ChildExperienceLayer from "./ChildExperienceLayer";
import ChildGiftAutoDisplay from "./ChildGiftAutoDisplay";
import ChildSectionNav from "./ChildSectionNav";

export default function ChildLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ChildExperienceLayer />
      <ChildGiftAutoDisplay />
      <ChildSectionNav />
    </>
  );
}
