const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rpvlaahbvsxkwugdigxm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwdmxhYWhidnN4a3d1Z2RpZ3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2OTM5NzMsImV4cCI6MjA4NzI2OTk3M30.xWVK-_4kiskGnEyFpZxSKtlgtbh5JC37Ft0dXAkG1y0');
const url = supabase.storage.from('avatars').getPublicUrl('test.jpg', { transform: { width: 400, height: 400, resize: 'contain' } }).data.publicUrl;
console.log(url);
