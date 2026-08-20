ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_color_valid;
ALTER TABLE public.plans ADD CONSTRAINT plans_color_valid CHECK (color IN (
  'navy','limelight','teal','lime','amber','burgundy','blush','cream','ink','fire_red','hot_pink','periwinkle','sage','clay','slate'
));