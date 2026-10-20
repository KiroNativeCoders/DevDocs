-- Migration 0011: Daily Site Analytics & Visitor Tracking
-- Run this in your Supabase SQL Editor (Project -> SQL Editor)

CREATE TABLE IF NOT EXISTS site_visit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  path TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  user_agent TEXT,
  visited_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_site_visit_date ON site_visit(visited_date);
CREATE INDEX IF NOT EXISTS idx_site_visit_visitor ON site_visit(visitor_id);
CREATE INDEX IF NOT EXISTS idx_site_visit_path ON site_visit(path);

-- Enable Row Level Security
ALTER TABLE site_visit ENABLE ROW LEVEL SECURITY;

-- Allow anonymous or authenticated clients to log visits
CREATE POLICY "Allow public visit logging"
  ON site_visit
  FOR INSERT
  WITH CHECK (true);

-- Allow reading visits for statistics (authenticated users or service role)
CREATE POLICY "Allow reading visit statistics"
  ON site_visit
  FOR SELECT
  USING (true);
