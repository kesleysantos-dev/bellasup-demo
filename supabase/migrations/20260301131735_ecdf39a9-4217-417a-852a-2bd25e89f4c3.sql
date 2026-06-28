
CREATE OR REPLACE FUNCTION public.validate_agendamento_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Block appointments in the past (with 30min margin)
  IF (NEW.data < CURRENT_DATE) OR 
     (NEW.data = CURRENT_DATE AND NEW.hora <= (CURRENT_TIME + INTERVAL '30 minutes')) THEN
    RAISE EXCEPTION 'Não é possível agendar em horários que já passaram.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_agendamento_before_insert
BEFORE INSERT ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.validate_agendamento_time();
