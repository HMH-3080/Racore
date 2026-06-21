import { useDialog } from "../../providers/dialog";
import { listSkills, type Skill } from "../../lib/skills";
import { useTheme } from "../../providers/theme";

export function SkillsDialogContent() {
  const dialog = useDialog();
  const { colors } = useTheme();
  const skills = listSkills();

  return (
    <box flexDirection="column" gap={1} padding={1}>
      {skills.length === 0 ? (
        <text fg={colors.dimSeparator}>No skills found. Skills are markdown files in .racore/skills/ or ~/.racore/skills/</text>
      ) : (
        skills.map((skill) => (
          <box key={skill.path} flexDirection="column" gap={0}>
            <box flexDirection="row" gap={1}>
              <text attributes={{ bold: true }}>{skill.name}</text>
              <text fg={colors.dimSeparator}>[{skill.scope}]</text>
            </box>
            {skill.description ? (
              <text fg={colors.dimSeparator} wrapMode="word">{skill.description}</text>
            ) : null}
            {skill.triggers.length > 0 ? (
              <text fg={colors.dimSeparator}>triggers: {skill.triggers.join(", ")}</text>
            ) : null}
          </box>
        ))
      )}
      <text fg={colors.dimSeparator} wrapMode="word">
        Press Escape to close
      </text>
    </box>
  );
}
