"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type PortalAccess = { teacher?: boolean; family?: boolean };

export default function LegacyQuranReviewsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirectByRole() {
      const client = supabase;
      if (!client) {
        router.replace("/login?type=teacher");
        return;
      }

      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login?type=teacher");
        return;
      }

      const result = await client.rpc("get_my_portal_access");
      const access = (result.data || {}) as PortalAccess;

      if (access.teacher) {
        router.replace("/teacher/quran/reviews");
      } else if (access.family) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    }

    redirectByRole();
  }, [router]);

  return <main className="dashboard-loading">جارٍ توجيهك إلى المساحة المناسبة...</main>;
}
