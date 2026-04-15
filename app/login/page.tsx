import { redirect } from "next/navigation";

export default function LoginPage() {
  // Redirect to the main page which has the login/signup forms
  redirect("/");
}
