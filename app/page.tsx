import { redirect } from "next/navigation";

/** `/` is just a doorway — proxy.ts has already decided if there's a session. */
export default function RootPage() {
  redirect("/home");
}
