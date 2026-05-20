-- Chuyển đổi kiểu dữ liệu của vĩ độ và kinh độ sang DOUBLE PRECISION
ALTER TABLE trace_logs 
    ALTER COLUMN latitude TYPE DOUBLE PRECISION USING latitude::double precision,
    ALTER COLUMN longitude TYPE DOUBLE PRECISION USING longitude::double precision;
