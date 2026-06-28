
-- Add imagem_url to servicos
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS imagem_url text DEFAULT '';

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public) VALUES ('servicos', 'servicos', true) ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for service images
CREATE POLICY "Service images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'servicos');
CREATE POLICY "Users can upload service images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'servicos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update service images" ON storage.objects FOR UPDATE USING (bucket_id = 'servicos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete service images" ON storage.objects FOR DELETE USING (bucket_id = 'servicos' AND auth.uid()::text = (storage.foldername(name))[1]);
