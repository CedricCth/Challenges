import { Button } from "@/components/ui/button";

import { signOut } from "../actions";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        Log out
      </Button>
    </form>
  );
}
