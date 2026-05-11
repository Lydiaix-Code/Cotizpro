import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { getIsPremium } from "@/lib/premium";
import { getAppNotifications } from "@/lib/utils/notifications";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isPremium = await getIsPremium();
  const notifications = await getAppNotifications(isPremium);

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex">
        <Sidebar isPremium={isPremium} notifications={notifications} />
      </div>

      {/* Contenu principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navigation mobile */}
        <MobileNav isPremium={isPremium} notifications={notifications} />

        {/* Zone de contenu scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
