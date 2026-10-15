import { RulesSyncForm } from "@/components/admin/RulesSyncForm";
import { TimingForm } from "@/components/admin/TimingForm";
import { PageHeader } from "@/components/admin/ui";
import { getAlertTiming, getRulesCues } from "@/lib/server/settings";

export default async function AdminSettings() {
  const [timing, cues] = await Promise.all([getAlertTiming(), getRulesCues()]);
  return (
    <>
      <PageHeader title="Settings" sub="Applies to every exam screen — screens that are already open pick up changes after a reload" />
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Alert timing</h2>
      <TimingForm initial={timing} />
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-400">Exam rules audio</h2>
      <RulesSyncForm initial={cues} />
    </>
  );
}
