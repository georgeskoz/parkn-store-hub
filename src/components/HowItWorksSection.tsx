import { motion } from "framer-motion";
import { Search, CalendarCheck, KeyRound } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Search & Browse",
    description: "Enter your location and dates to browse available parking spots and storage spaces nearby.",
  },
  {
    icon: CalendarCheck,
    step: "02",
    title: "Book Instantly",
    description: "Reserve your spot in seconds with real-time availability. Secure payment at checkout.",
  },
  {
    icon: KeyRound,
    step: "03",
    title: "Park or Store",
    description: "Get directions and access instructions. Show up and use your reserved space — hassle-free.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-secondary/40">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            How it works
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Three simple steps to your perfect spot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="text-center"
            >
              <div className="relative mx-auto w-20 h-20 rounded-full hero-gradient flex items-center justify-center mb-6">
                <step.icon className="w-8 h-8 text-primary-foreground" />
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                  {step.step}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
