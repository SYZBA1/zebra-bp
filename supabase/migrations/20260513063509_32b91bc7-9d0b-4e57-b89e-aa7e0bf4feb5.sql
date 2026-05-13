
-- Extend app_role enum with 'expert'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'expert';

-- Experts table
CREATE TABLE public.experts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  name text NOT NULL,
  title text NOT NULL,
  industry text NOT NULL,
  bio text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  price_etb numeric NOT NULL DEFAULT 500,
  years_experience integer NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 5,
  appointments integer NOT NULL DEFAULT 0,
  approval_rate integer NOT NULL DEFAULT 95,
  offering text NOT NULL DEFAULT '',
  deliverable text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  online boolean NOT NULL DEFAULT false,
  accent text NOT NULL DEFAULT 'from-orange-500/30 to-orange-500/5',
  initials text NOT NULL DEFAULT 'EX',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view experts" ON public.experts FOR SELECT USING (true);
CREATE POLICY "Admins insert experts" ON public.experts FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete experts" ON public.experts FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins or owner update experts" ON public.experts FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE TRIGGER experts_updated_at BEFORE UPDATE ON public.experts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expert bookings table
CREATE TABLE public.expert_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  expert_id uuid NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  expert_user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  topic text NOT NULL,
  description text,
  preferred_date date,
  preferred_time text,
  amount_etb numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'telebirr',
  transaction_ref text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bookings visible to participants and admins" ON public.expert_bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = expert_user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own bookings" ON public.expert_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Expert or admin update bookings" ON public.expert_bookings FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = expert_user_id OR auth.uid() = user_id);

CREATE POLICY "Admins delete bookings" ON public.expert_bookings FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER expert_bookings_updated_at BEFORE UPDATE ON public.expert_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow notifications to be inserted by booking trigger / app
CREATE POLICY "Authenticated insert notifications" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (true);

-- Seed experts
INSERT INTO public.experts (name, title, industry, bio, tags, price_etb, years_experience, rating, appointments, approval_rate, offering, deliverable, verified, online, accent, initials) VALUES
('Dawit Tadesse','Senior Business Strategist & Financial Modeler','Agro-Processing','Specialist in AI-native business plans for 50+ Ethiopian sectors.',ARRAY['Feasibility Studies','Financial Modeling','Agro'],500,9,4.9,124,98,'Full Feasibility Study (Standard)','Includes 12-Month Financial Forecast',true,true,'from-orange-500/30 to-orange-500/5','DT'),
('Hanna Mekonnen','Investment Analyst & Bank Liaison','Banking & Finance','Former CBE credit analyst — structures loan-ready documents.',ARRAY['Bank Approval','SME Loans','CBE'],500,7,4.8,98,96,'Bank-Ready Business Plan','Loan Application Pack + Pitch',true,true,'from-emerald-500/30 to-emerald-500/5','HM'),
('Yonas Bekele','Manufacturing Operations Consultant','Manufacturing','Designed 30+ light-manufacturing facilities across Oromia.',ARRAY['Plant Setup','Supply Chain','CAPEX'],500,11,4.7,76,94,'Industrial Feasibility Study','CAPEX/OPEX + 5Y Projection',true,false,'from-sky-500/30 to-sky-500/5','YB'),
('Selamawit Alemu','Agribusiness & Export Strategist','Agriculture','Coffee & spice export specialist with deep ECX network.',ARRAY['Coffee Export','Cooperatives','ECX'],500,12,5.0,142,99,'Export Feasibility Study','ECX Compliance + Trade Plan',true,true,'from-violet-500/30 to-violet-500/5','SA'),
('Bereket Girma','Tech & SaaS Strategy Consultant','Technology','Helped 20+ Addis startups raise pre-seed and seed.',ARRAY['SaaS Strategy','Fintech','GTM'],500,6,4.8,65,95,'SaaS Business Plan','GTM + Unit Economics Model',true,true,'from-rose-500/30 to-rose-500/5','BG'),
('Mahlet Assefa','Healthcare & Pharma Consultant','Healthcare','Licensed 50+ private clinics & pharmacies nationwide.',ARRAY['Clinic Setup','Pharma','EFDA'],500,10,4.9,88,97,'Clinic Feasibility & Licensing Plan','EFDA Pack + Equipment List',true,false,'from-amber-500/30 to-amber-500/5','MA'),
('Ermias Worku','Real Estate & Construction Analyst','Real Estate','Modeled $40M+ residential and mixed-use developments.',ARRAY['Real Estate','Construction','ROI'],500,14,4.6,54,92,'Real Estate Feasibility Study','Site Analysis + ROI Model',true,true,'from-orange-500/30 to-orange-500/5','EW'),
('Tigist Haile','Tourism & Hospitality Strategist','Tourism','Boutique hotel and lodge operator across Bahir Dar & Lalibela.',ARRAY['Hotels','Eco-Tourism','Hospitality'],500,8,4.8,72,95,'Hospitality Business Plan','Operations + Revenue Forecast',true,true,'from-emerald-500/30 to-emerald-500/5','TH'),
('Solomon Abebe','Logistics & Transport Consultant','Logistics','Built nationwide fleet operations from Djibouti to Addis.',ARRAY['Freight','Fleet','Cross-Border'],500,13,4.7,61,93,'Logistics Feasibility Study','Fleet CAPEX + Route Economics',true,false,'from-sky-500/30 to-sky-500/5','SA'),
('Liya Tesfaye','Fashion & Textile Industry Expert','Textile','Industrial-park textile expert with EU buyer network.',ARRAY['Garments','Export','Hawassa IP'],500,9,4.9,80,96,'Textile Plant Feasibility','Hawassa IP Pack + Export Plan',true,true,'from-violet-500/30 to-violet-500/5','LT'),
('Kalkidan Fikru','Education & EdTech Consultant','Education','K-12 and EdTech founder with MoE licensing experience.',ARRAY['Schools','EdTech','Licensing'],500,7,4.7,47,94,'School Setup Feasibility','MoE Licensing Pack',true,true,'from-rose-500/30 to-rose-500/5','KF'),
('Robel Nigussie','Renewable Energy Engineer','Energy','Off-grid solar specialist for rural Ethiopia.',ARRAY['Solar','Mini-Grid','EEP'],500,10,4.8,39,95,'Renewable Energy Feasibility','Solar Sizing + IRR Model',true,false,'from-amber-500/30 to-amber-500/5','RN'),
('Meron Solomon','Marketing & Brand Strategist','Marketing','Launched 30+ Ethiopian D2C brands online.',ARRAY['Brand','Digital','B2C'],500,6,4.6,92,91,'Go-To-Market Plan','Channel Mix + KPI Dashboard',true,true,'from-orange-500/30 to-orange-500/5','MS'),
('Abel Tariku','Mining & Minerals Consultant','Mining','Licensed geological surveyor with MoMP relationships.',ARRAY['Mining','Geology','MoMP'],500,15,4.8,28,96,'Mining Feasibility Study','Reserve Estimate + Permit Pack',true,false,'from-emerald-500/30 to-emerald-500/5','AT'),
('Helen Berhanu','Food & Beverage Consultant','Food & Beverage','Opened 12 high-traffic restaurants in Addis.',ARRAY['F&B','Restaurants','EFDA'],500,8,4.9,110,97,'Restaurant Feasibility & Concept','Menu Engineering + 3Y P&L',true,true,'from-sky-500/30 to-sky-500/5','HB'),
('Nahom Girmay','Import/Export Trade Consultant','Trade','Navigates NBE FX policy for importers daily.',ARRAY['Imports','Customs','FX'],500,11,4.7,66,93,'Import Business Plan','FX + Customs Cost Model',true,true,'from-violet-500/30 to-violet-500/5','NG'),
('Eden Asrat','HR & Organizational Consultant','HR & Org','Built HR systems for 100+ employee companies.',ARRAY['Org Design','Hiring','Policy'],500,9,4.6,52,90,'Organizational Structure Plan','Org Chart + HR Policy Pack',true,false,'from-rose-500/30 to-rose-500/5','EA'),
('Yared Demeke','Insurance & Risk Analyst','Insurance','Former Awash Insurance underwriter.',ARRAY['Risk','Insurance','Compliance'],500,12,4.7,33,94,'Risk & ESG Assessment','Risk Matrix + Mitigation Plan',true,true,'from-amber-500/30 to-amber-500/5','YD'),
('Sara Worku','Legal & Regulatory Advisor','Legal','Corporate lawyer specializing in business setup.',ARRAY['Licensing','Contracts','MoTI'],500,10,4.8,71,96,'Legal Compliance Pack','MoTI Licensing + Templates',true,true,'from-orange-500/30 to-orange-500/5','SW'),
('Henok Getachew','E-Commerce & Payments Expert','E-Commerce','Telebirr + Chapa integration specialist.',ARRAY['E-Comm','Telebirr','Chapa'],500,7,4.9,84,97,'E-Commerce Launch Plan','Tech Stack + Payment Integration',true,true,'from-emerald-500/30 to-emerald-500/5','HG');
