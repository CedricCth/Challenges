import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in to keep score against each other.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </main>
  );
}
