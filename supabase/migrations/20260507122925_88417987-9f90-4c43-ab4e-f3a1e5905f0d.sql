
-- Phase 1: extend marketplace_templates
ALTER TABLE public.marketplace_templates
  ADD COLUMN IF NOT EXISTS owner_name text NOT NULL DEFAULT 'ZEBRA',
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'community',
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating numeric(2,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS full_document text;

-- Phase 1: template_purchases
CREATE TABLE IF NOT EXISTS public.template_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  amount_etb numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  transaction_ref text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.template_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases" ON public.template_purchases
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own purchases" ON public.template_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update purchases" ON public.template_purchases
  FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete purchases" ON public.template_purchases
  FOR DELETE USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_template_purchases_updated
  BEFORE UPDATE ON public.template_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed company templates
INSERT INTO public.marketplace_templates
  (title, description, sector, category, document_type, is_premium, price_cents,
   owner_name, owner_type, is_verified, rating, rating_count, summary, full_document, contents, custom_titles)
VALUES
  ('EDB Standard Feasibility Study Format',
   'Official Ethiopian Development Bank feasibility study template required for loan applications.',
   'Banking & Finance', 'Official', 'feasibility', false, 0,
   'Ethiopian Development Bank', 'official', true, 4.8, 124,
   'EDB-compliant feasibility study covering market, technical, financial, and risk analysis aligned with EDB loan appraisal criteria.',
   E'# EDB Feasibility Study\n\n## 1. Executive Summary\nProject overview aligned with EDB priority sectors.\n\n## 2. Promoter & Ownership\nLegal status, shareholders, management team.\n\n## 3. Market Analysis\nDemand, supply gap, target segments, pricing.\n\n## 4. Technical Analysis\nLocation, technology, machinery, raw materials, utilities.\n\n## 5. Organization & Manpower\nOrg chart, staffing plan, training.\n\n## 6. Financial Analysis\nCAPEX, OPEX, projected income statement, cash flow, NPV, IRR, DSCR.\n\n## 7. Risk Analysis\nMarket, operational, financial, ESG risks and mitigation.\n\n## 8. Conclusion & Recommendation',
   '{}'::jsonb, '{}'::jsonb),
  ('Ministry of Labour & Skills — TVET Business Plan',
   'Standard business plan format for TVET graduates and skill-based enterprises (ስራና ክህሎት ሚኒስቴር).',
   'Education / University, School & Training', 'Official', 'business_plan', false, 0,
   'Ministry of Labour & Skills', 'official', true, 4.7, 89,
   'Bilingual (EN/AM) business plan template tailored for TVET graduates seeking startup financing or cooperative registration.',
   E'# TVET Business Plan / የቴክኒክና ሙያ የንግድ እቅድ\n\n## 1. Business Idea / የንግድ ሀሳብ\n\n## 2. Owner Profile / የባለቤት መግለጫ\n\n## 3. Products & Services / ምርቶችና አገልግሎቶች\n\n## 4. Market & Customers / ገበያና ደንበኞች\n\n## 5. Operations Plan / የስራ ዕቅድ\n\n## 6. Required Investment / የሚያስፈልግ ኢንቨስትመንት\n\n## 7. Financial Projections / የገንዘብ ትንበያ\n\n## 8. Implementation Timeline',
   '{}'::jsonb, '{}'::jsonb),
  ('Ministry of Trade — Company Profile Standard',
   'Official company profile format accepted for trade license renewal and tender submissions.',
   'Trade & Commerce', 'Official', 'company_profile', false, 0,
   'Ministry of Trade & Regional Integration', 'official', true, 4.6, 67,
   'Standardized company profile covering legal identity, capacity, past projects, and certifications for procurement readiness.',
   E'# Company Profile\n\n## 1. Company Overview\n\n## 2. Vision, Mission & Values\n\n## 3. Legal Status & Ownership\n\n## 4. Organizational Structure\n\n## 5. Core Services & Capabilities\n\n## 6. Past Projects & Clients\n\n## 7. Certifications & Memberships\n\n## 8. Contact Information',
   '{}'::jsonb, '{}'::jsonb),
  ('Ministry of Industry — Manufacturing Feasibility',
   'Approved feasibility framework for manufacturing and agro-processing investment licenses.',
   'Manufacturing & Industry', 'Official', 'feasibility', true, 49900,
   'Ministry of Industry', 'official', true, 4.9, 53,
   'Premium manufacturing feasibility template with detailed CAPEX/OPEX models, EPC schedule, and ESG compliance sections.',
   E'# Manufacturing Feasibility Study\n\n## 1. Executive Summary\n\n## 2. Industry & Market Analysis\n\n## 3. Product & Process Description\n\n## 4. Plant Capacity & Technology\n\n## 5. Location & Site\n\n## 6. Raw Materials & Utilities\n\n## 7. Manpower & Organization\n\n## 8. Project Implementation Schedule\n\n## 9. CAPEX & OPEX\n\n## 10. Financial Analysis (NPV, IRR, Payback, DSCR)\n\n## 11. Sensitivity & Risk\n\n## 12. ESG & Environmental Impact',
   '{}'::jsonb, '{}'::jsonb)
ON CONFLICT DO NOTHING;
