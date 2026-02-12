import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Car, Warehouse } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
            <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            SpotVault
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/parking" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Find Parking
            </Link>
            <Link to="/storage" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Find Storage
            </Link>
            <Link to="/list" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              List Your Space
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Log In
            </Button>
            <Button size="sm">
              Sign Up
            </Button>
          </div>

          <button
            className="md:hidden text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link to="/parking" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Find Parking
            </Link>
            <Link to="/storage" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Find Storage
            </Link>
            <Link to="/list" className="block px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              List Your Space
            </Link>
            <div className="flex gap-2 pt-2 px-3">
              <Button variant="ghost" size="sm" className="flex-1">Log In</Button>
              <Button size="sm" className="flex-1">Sign Up</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
