
-- Create listings table
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('parking', 'storage')),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Address details
  address TEXT NOT NULL,
  unit TEXT,
  postal_code TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,
  
  -- Location coordinates
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  
  -- Features & availability
  features TEXT[] DEFAULT '{}',
  availability TEXT NOT NULL DEFAULT 'available',
  
  -- Parking specific
  spots INT,
  
  -- Storage specific
  size TEXT,
  sqft INT,
  
  -- Pricing
  hourly NUMERIC,
  daily NUMERIC,
  monthly NUMERIC,
  weekly NUMERIC,
  seasonal NUMERIC,
  cancellation TEXT,
  
  -- Student discount
  student_discount BOOLEAN DEFAULT false,
  student_discount_percent INT DEFAULT 10,
  student_universities TEXT,
  
  -- Landmarks & landmarks
  nearby_landmarks TEXT[] DEFAULT '{}',
  
  -- Photos stored as JSONB array of {url, path}
  photos JSONB DEFAULT '[]'::jsonb,
  
  -- Disclaimer
  disclaimer_accepted BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on user_id for faster queries
CREATE INDEX idx_listings_user_id ON public.listings(user_id);
CREATE INDEX idx_listings_category ON public.listings(category);
CREATE INDEX idx_listings_city ON public.listings(city);

-- Enable Row Level Security
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all listings (public marketplace)
CREATE POLICY "Anyone can view listings"
ON public.listings FOR SELECT
USING (true);

-- Policy: Users can insert their own listings
CREATE POLICY "Users can create their own listings"
ON public.listings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own listings
CREATE POLICY "Users can update their own listings"
ON public.listings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own listings
CREATE POLICY "Users can delete their own listings"
ON public.listings FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
