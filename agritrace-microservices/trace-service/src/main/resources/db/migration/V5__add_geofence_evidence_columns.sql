ALTER TABLE trace_logs
ADD COLUMN IF NOT EXISTS distance_from_farm_km NUMERIC(10,3);

ALTER TABLE trace_logs
ADD COLUMN IF NOT EXISTS within_geofence BOOLEAN;
