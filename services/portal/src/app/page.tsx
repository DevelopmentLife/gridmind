import { redirect } from "next/navigation";

// Root redirects authenticated users to /deployments.
// Client-side auth check is handled by the authenticated layout.
export default function RootPage() {
  redirect("/deployments");
}
