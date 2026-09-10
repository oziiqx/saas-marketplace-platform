import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { SecurityCenter } from "@/components/dashboard/security-center";
import { requireUser } from "@/lib/auth/session";
import { getSecurityData } from "@/server/queries/security";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const user = await requireUser();
  const data = await getSecurityData(user.id);
  if (!data.user) notFound();

  return (
    <>
      <PageHeader
        title="Security center"
        description="Profile, password, two-factor authentication, sessions and notifications."
      />
      <SecurityCenter
        profile={{
          name: data.user.name,
          email: data.user.email,
          image: data.user.image,
          twoFactorEnabled: data.user.twoFactorEnabled,
        }}
        sessions={data.sessions}
        preferences={data.preferences.map((p) => ({
          channel: p.channel,
          category: p.category,
          enabled: p.enabled,
        }))}
      />
    </>
  );
}
