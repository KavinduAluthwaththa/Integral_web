-- Ensure redeem_coupon runs with definer privileges so RLS on coupons does not block updates
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET current_uses = current_uses + 1
  WHERE code = p_code
    AND active = true
    AND (max_uses IS NULL OR current_uses < max_uses);

  RETURN FOUND;
END;
$$;
