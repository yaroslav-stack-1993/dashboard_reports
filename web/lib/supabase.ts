import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export type AdStat = {
  id: number
  client_login: string
  date: string
  campaign_id: number | null
  campaign_name: string | null
  ad_group_id: number | null
  ad_id: number | null
  clicks: number
  impressions: number
  ctr: number
  cost: number
  conversions: number
  cost_per_conversion: number
  created_at: string
}
