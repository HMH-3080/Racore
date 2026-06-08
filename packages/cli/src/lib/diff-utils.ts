export type DiffLine = {
  type: "add" | "del" | "ctx";
  text: string;
  lineA?: number;
  lineB?: number;
};

function longestCommonSubsequence(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

function backtrackDiff(
  a: string[],
  b: string[],
  dp: number[][],
  i: number,
  j: number,
  result: DiffLine[],
): void {
  if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
    backtrackDiff(a, b, dp, i - 1, j - 1, result);
    result.push({ type: "ctx", text: a[i - 1], lineA: i, lineB: j });
  } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
    backtrackDiff(a, b, dp, i, j - 1, result);
    result.push({ type: "add", text: b[j - 1], lineB: j });
  } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
    backtrackDiff(a, b, dp, i - 1, j, result);
    result.push({ type: "del", text: a[i - 1], lineA: i });
  }
}

export function computeDiff(oldText: string, newText: string): DiffLine[] {
  if (!oldText && !newText) return [];
  if (!oldText) {
    return newText.split("\n").map((line, i) => ({
      type: "add" as const,
      text: line,
      lineB: i + 1,
    }));
  }
  if (!newText) {
    return oldText.split("\n").map((line, i) => ({
      type: "del" as const,
      text: line,
      lineA: i + 1,
    }));
  }

  const a = oldText.split("\n");
  const b = newText.split("\n");
  const dp = longestCommonSubsequence(a, b);
  const result: DiffLine[] = [];
  backtrackDiff(a, b, dp, a.length, b.length, result);
  return result;
}

export function formatDiffLines(diff: DiffLine[]): string {
  return diff
    .map((line) => {
      const prefix = line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
      return `${prefix} ${line.text}`;
    })
    .join("\n");
}
