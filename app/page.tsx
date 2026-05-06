import { HomeLayout } from "@/components/HomeLayout";
import { loadScamLibrary } from "@/lib/detection/patterns";

export default function HomePage() {
  const library = loadScamLibrary();
  return (
    <main className="min-h-screen">
      <HomeLayout library={library} />
    </main>
  );
}
