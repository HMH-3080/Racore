import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Here you would exchange the code for a token and validate the state
  // For now, we'll just redirect to the home page
  return NextResponse.redirect(new URL("/", request.url));
}
