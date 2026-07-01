import ChildExperienceLayer from "./ChildExperienceLayer";
import ChildGiftAutoDisplay from "./ChildGiftAutoDisplay";
import ChildJourneyCoach from "./ChildJourneyCoach";
import ChildSectionNav from "./ChildSectionNav";

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<ChildExperienceLayer /><ChildGiftAutoDisplay /><ChildJourneyCoach /><ChildSectionNav /></>;
}
