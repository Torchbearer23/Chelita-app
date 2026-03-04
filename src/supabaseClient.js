import { createClient } from '@supabase/supabase-js'

// URL CORREGIDA (Copiada de tu imagen de configuración)
const supabaseUrl = 'https://gjvfemikcpezlgkwwfji.supabase.co' 

// Asegúrate de copiar la clave ANON de nuevo por si acaso
const supabaseAnonKey = 'sb_publishable_Z9sT3me7B_dF-GdtLIunuA_MTHfQf6y' 

export const supabase = createClient(supabaseUrl, supabaseAnonKey)