import Hero from "@/components/home/Hero";
import Navbar from "@/components/home/Navbar";
import Destinations from "@/components/home/Destinations";
export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950">
      <Navbar />
      <Hero />
    </main>
  );
}