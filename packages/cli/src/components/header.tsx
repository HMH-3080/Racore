import { CLI_VERSION } from "../lib/app-info";

export function Header() {
  return (
    <box flexDirection="column" justifyContent="center" alignItems="center" gap={1}>
      <box flexDirection="row" justifyContent="center" gap={0.5} alignItems="center">
        <ascii-font font="tiny" text="R'a" color="gray" />
        <ascii-font font="tiny" text="Core" />
      </box>
      <text>v{CLI_VERSION}</text>
    </box>
  );
}
