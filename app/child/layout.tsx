import ChildExperienceLayer from "./ChildExperienceLayer";
import ChildGiftAutoDisplay from "./ChildGiftAutoDisplay";
import ChildSectionNav from "./ChildSectionNav";

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<ChildExperienceLayer /><ChildGiftAutoDisplay /><ChildSectionNav /></>;
}
