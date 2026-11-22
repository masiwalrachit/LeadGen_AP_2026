import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LeadGen — Evidence-backed prospecting",
    template: "%s · LeadGen",
  },
  description:
    "Find businesses with public, checkable evidence that they need web development work.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eeeae0" },
    { media: "(prefers-color-scheme: dark)", color: "#141310" },
  ],
};

// Applies a saved theme choice before the first paint so the page never flashes the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem("leadgen.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
