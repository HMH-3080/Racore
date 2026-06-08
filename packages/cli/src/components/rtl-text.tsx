import type { ReactNode } from "react";
import { TextAttributes } from "@opentui/core";
import { hasArabic } from "../lib/rtl";

type RTLTextProps = {
  children?: ReactNode;
  fg?: string;
  bg?: string;
  attributes?: Partial<Record<TextAttributes, boolean>>;
  wrapMode?: "word" | "char" | "none";
  color?: string;
  selectable?: boolean;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  overflow?: "hidden" | "visible";
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function RTLText({ children, ...rest }: RTLTextProps) {
  if (isString(children) && hasArabic(children)) {
    const rtlText = `\u202B${children}\u202C`;
    return <text {...rest}>{rtlText}</text>;
  }

  return <text {...rest}>{children}</text>;
}
