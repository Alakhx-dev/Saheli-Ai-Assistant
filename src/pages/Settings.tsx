import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Volume2 } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { user } = useAuth();
  const [voicePref, setVoicePref] = useState<"female" | "male">("female");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("voice_preference")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.voice_preference) {
          setVoicePref(data.voice_preference as "female" | "male");
        }
        setLoading(false);
      });
  }, [user]);

  const updateVoice = async (val: "female" | "male") => {
    setVoicePref(val);
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ voice_preference: val })
      .eq("id", user.id);
    if (error) toast.error("Failed to save preference");
    else toast.success(`Voice set to ${val}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Apni preferences customize karo ⚙️
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">
            Loading…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Voice toggle */}
            <div className="glass rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-primary" />
                <div>
                  <Label className="text-sm font-medium">Voice Gender</Label>
                  <p className="text-xs text-muted-foreground">
                    {voicePref === "female" ? "Female (Swara)" : "Male (Madhur)"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>F</span>
                <Switch
                  checked={voicePref === "male"}
                  onCheckedChange={(checked) =>
                    updateVoice(checked ? "male" : "female")
                  }
                />
                <span>M</span>
              </div>
            </div>

            {/* User info */}
            <div className="glass rounded-xl p-5">
              <Label className="text-sm font-medium">Account</Label>
              <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
