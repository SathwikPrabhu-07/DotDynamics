import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const SettingsPage = () => {
  const [units, setUnits] = useState("metric");
  const [gravity, setGravity] = useState(9.8);

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="font-heading text-2xl font-bold text-foreground">Settings</h1>

      {/* Units */}
      <div className="space-y-3 rounded-lg border bg-card p-6 shadow-card">
        <h2 className="font-heading text-base font-semibold text-foreground">Preferences</h2>

        <div className="space-y-2">
          <Label>Units</Label>
          <Select value={units} onValueChange={setUnits}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="metric">Metric (SI)</SelectItem>
              <SelectItem value="imperial">Imperial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Default Gravity (m/s²)</Label>
            <span className="text-sm font-medium text-foreground tabular-nums">{gravity}</span>
          </div>
          <Slider min={0} max={25} step={0.1} value={[gravity]} onValueChange={([v]) => setGravity(v)} />
        </div>
      </div>

      {/* Account */}
      <div className="space-y-3 rounded-lg border bg-card p-6 shadow-card">
        <h2 className="font-heading text-base font-semibold text-foreground">Account</h2>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value="" placeholder="Not signed in" disabled />
        </div>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input defaultValue="" placeholder="Set your name" />
        </div>
        <Button variant="outline" size="sm">Update Profile</Button>
      </div>

      {/* Danger */}
      <div className="rounded-lg border border-destructive/30 bg-card p-6 shadow-card">
        <h2 className="font-heading text-base font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all data.</p>
        <Button variant="destructive" size="sm" className="mt-3">Delete Account</Button>
      </div>
    </div>
  );
};

export default SettingsPage;
