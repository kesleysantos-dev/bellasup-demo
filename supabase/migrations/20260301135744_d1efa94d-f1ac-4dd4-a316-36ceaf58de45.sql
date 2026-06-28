
CREATE OR REPLACE FUNCTION public.validate_agendamento_time()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  brasilia_now timestamp;
BEGIN
  brasilia_now := (now() AT TIME ZONE 'America/Sao_Paulo');
  
  -- Block appointments in the past (with 5min tolerance)
  IF (NEW.data < brasilia_now::date) OR 
     (NEW.data = brasilia_now::date AND NEW.hora <= (brasilia_now::time + INTERVAL '5 minutes')) THEN
    RAISE EXCEPTION 'Não é possível agendar em horários que já passaram.';
  END IF;
  RETURN NEW;
END;
$function$;
