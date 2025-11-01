/*
  # Exchange Rates Tablosunu Oluştur
  
  1. Yeni Tablo
    - `exchange_rates`
      - `id` (uuid, primary key)
      - `from_currency` (text) - Kaynak para birimi
      - `to_currency` (text) - Hedef para birimi
      - `rate` (numeric) - Döviz kuru
      - `source` (text) - Veri kaynağı
      - `recorded_at` (timestamptz) - Kayıt zamanı
      - `created_at` (timestamptz) - Oluşturma zamanı
  
  2. Güvenlik
    - RLS etkin
    - Herkes okuyabilir (anonim + authenticated)
*/

CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL,
  source text DEFAULT 'manual',
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS aktif et
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "Anyone can read exchange rates"
  ON exchange_rates
  FOR SELECT
  TO public
  USING (true);

-- Sadece authenticated kullanıcılar yazabilir
CREATE POLICY "Authenticated users can insert exchange rates"
  ON exchange_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies 
  ON exchange_rates(from_currency, to_currency, recorded_at DESC);

-- Başlangıç verileri ekle (USD ve EUR kurları)
INSERT INTO exchange_rates (from_currency, to_currency, rate, source)
VALUES 
  ('USD', 'TRY', 34.50, 'manual'),
  ('EUR', 'TRY', 37.20, 'manual')
ON CONFLICT DO NOTHING;