import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;
  const privateRoute = ["/app", "/onboarding", "/dashboard", "/campaigns", "/find-leads", "/analyze-leads", "/team", "/leads", "/setup"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (privateRoute && !signedIn) {
    const signupUrl = request.nextUrl.clone();
    signupUrl.pathname = "/signup";
    signupUrl.search = "";
    signupUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(signupUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (pathname === "/signup" && signedIn) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/app";
    appUrl.search = "";
    const redirectResponse = NextResponse.redirect(appUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}
