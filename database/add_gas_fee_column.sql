-- Add gas_fee_paid column to conversions table
-- This stores the TON gas fee paid by the user for the conversion

ALTER TABLE conversions 
ADD COLUMN IF NOT EXISTS gas_fee_paid NUMERIC DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN conversions.gas_fee_paid IS 'TON gas fee paid by user for conversion (default 0.1 TON)';

-- Create index for querying by gas fee
CREATE INDEX IF NOT EXISTS idx_conversions_gas_fee ON conversions(gas_fee_paid);
