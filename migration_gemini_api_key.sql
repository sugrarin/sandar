-- Migration: Add gemini_api_key column to profiles
-- Run in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
