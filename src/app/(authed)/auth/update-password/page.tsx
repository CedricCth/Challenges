import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>
            Pick something you can actually remember.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
