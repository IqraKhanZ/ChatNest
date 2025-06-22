import React, { useState } from "react";
import { User, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Navbar() {
  const { profile, signOut, loading } = useSupabaseAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // New: Handler for account deletion via edge function
  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      // Get the JWT using the imported supabase client (not window.supabase)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? "";

      const res = await fetch(
        "https://ecjxhtnpsvtkdiwlxext.functions.supabase.co/delete-user-account",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Pass user's JWT for auth
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await res.json();
      setDeleting(false);
      if (res.ok && data.success) {
        toast({
          title: "Account deleted",
          description: "Your account and all data has been permanently removed.",
        });
        // Fully sign out and reload to clear all state!
        await signOut();
        window.location.href = "/";
      } else {
        toast({
          title: "Delete failed",
          description: data.error || "Could not delete your account. Try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setDeleting(false);
      toast({
        title: "Error",
        description: err?.message || "Account deletion failed.",
        variant: "destructive",
      });
    }
  }

  return (
    <nav className="flex items-center justify-between w-full px-4 py-3 bg-sidebar shadow-2xl border-b border-sidebar-border transition-colors duration-300">
      <div className="flex items-center gap-3">
        <User className="w-6 h-6 text-accent" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="px-2 focus-visible:ring-0 hover:bg-transparent text-foreground font-medium">
              {profile?.username || "Anonymous"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[180px]">{profile?.email}</div>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-red-600 font-semibold cursor-pointer flex items-center gap-2"
              onSelect={(e) => {
                e.preventDefault();
                setOpenDialog(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete My Account
            </DropdownMenuItem>

            {/* Delete Account Confirm Dialog */}
            <AlertDialog open={openDialog} onOpenChange={setOpenDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <Button variant="secondary" disabled={deleting}>
                      Cancel
                    </Button>
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    disabled={deleting}
                    onClick={handleDeleteAccount}
                  >
                    {deleting ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <DropdownMenuSeparator />
            {/* Logout */}
            <DropdownMenuItem
              className="text-accent hover:bg-sidebar-accent font-semibold flex gap-1 cursor-pointer"
              onClick={signOut}
              disabled={loading}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-xs text-accent ml-2">• online</span>
      </div>
    </nav>
  );
}
