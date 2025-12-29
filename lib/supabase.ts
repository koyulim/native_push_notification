/**
 * @fileoverview Supabase Client Configuration
 * Initializes and configures the Supabase client for the React Native application.
 * Handles authentication storage, session persistence, and URL polyfills.
 *
 * @author Your Name
 * @version 1.0.0
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

/** Supabase project URL from environment variables */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";

/** Supabase anonymous key from environment variables */
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Web-safe storage wrapper for AsyncStorage
 * Prevents SSR errors by checking for window availability
 */
const webSafeStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === "web" && typeof window === "undefined") {
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web" && typeof window === "undefined") {
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web" && typeof window === "undefined") {
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

/**
 * Configured Supabase client instance
 * Set up with AsyncStorage for session persistence and proper auth configuration
 *
 * @constant {SupabaseClient} supabase - The configured Supabase client
 *
 * @example
 * // Use for authentication
 * const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 *
 * // Use for database operations
 * const { data, error } = await supabase.from('profiles').select('*');
 *
 * // Use for Edge Functions
 * const { data, error } = await supabase.functions.invoke('openai', { body: { message } });
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: webSafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
