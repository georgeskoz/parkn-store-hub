import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import DateTimePicker, { DateTimeValue, writeDateTimeToParams } from "@/components/search/DateTimePicker";

const HeroSection = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [when, setWhen] = useState<DateTimeValue>({});

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location.trim()) params.set("q", location.trim());
    writeDateTimeToParams(params, "parking", when);
    navigate(`/find${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Urban cityscape with parking and storage spaces"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-20">
        <div className="max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-6xl font-bold text-primary-foreground leading-tight text-balance"
          >
            Park & Store,{" "}
            <span className="text-accent">Anywhere</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-5 text-lg text-primary-foreground/80 max-w-lg"
          >
            Discover available parking spots and storage spaces near you. 
            List your unused space and earn — it's that simple.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <Button variant="hero" size="lg" className="text-base" onClick={() => navigate("/find")}>
              <Search className="w-5 h-5 mr-2" />
              Find a Spot
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base" onClick={() => navigate("/list")}>
              List Your Space
            </Button>
          </motion.div>
        </div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-12 max-w-3xl"
        >
          <div className="bg-card rounded-xl p-2 card-shadow flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary/50">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Location or address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-transparent w-full text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary/50">
              <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Date & time"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-transparent w-full text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            <Button className="px-8" onClick={handleSearch}>
              Search
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
