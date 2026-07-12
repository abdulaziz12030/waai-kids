import "./child-simplified.css";
import "./child-dashboard-v3.css";
import "./child-layout-cleanup.css";
import "./child-unified-nav.css";
import "./child-task-flow.css";
import "./floating-goal-prompt.css";
import "./child-header-actions.css";
import "./multiplication-task-inline.css";
import "./multiplication-feedback.css";
import ChildExperienceLayer from "./ChildExperienceLayer";
import ChildGiftAutoDisplay from "./ChildGiftAutoDisplay";
import ChildSectionNav from "./ChildSectionNav";
import FloatingGoalPrompt from "./FloatingGoalPrompt";
import MultiplicationTaskEnhancer from "./MultiplicationTaskEnhancer";
import MultiplicationLearningFeedback from "./MultiplicationLearningFeedback";

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
      <FloatingGoalPrompt />
      <MultiplicationTaskEnhancer />
      <MultiplicationLearningFeedback />
      <ChildSectionNav />
    </>
  );
}
