-- Rewrite the order status transition trigger to match the new lifecycle
-- This fixes 400 Bad Request errors during admin status updates

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent transitions once cancelled or delivered
    IF OLD.order_status = 'cancelled' AND NEW.order_status != 'cancelled' THEN
        RAISE EXCEPTION 'Cannot change status of a cancelled order';
    END IF;

    IF OLD.order_status = 'delivered' AND NEW.order_status != 'delivered' THEN
        RAISE EXCEPTION 'Cannot change status of a delivered order';
    END IF;

    -- Standard transition validation
    -- If status is changing to cancelled, ensure it wasn't already shipped (optional business rule)
    -- IF NEW.order_status = 'cancelled' AND OLD.order_status NOT IN ('placed', 'in_production') THEN
    --     RAISE EXCEPTION 'Cannot cancel an order that has already been shipped';
    -- END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-apply trigger just to be safe
DROP TRIGGER IF EXISTS trg_validate_order_status ON public.orders;
CREATE TRIGGER trg_validate_order_status
BEFORE UPDATE OF order_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();
