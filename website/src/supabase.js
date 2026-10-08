(() => {
  const config = globalThis.DAILY_RITUAL_SUPABASE_CONFIG || {};
  const isConfigured = Boolean(config.url && config.anonKey);

  class SupabaseSync {
    constructor() {
      this.client = null;
      this.user = null;
      this.enabled = isConfigured;
      this.initialized = false;
    }

    async initialize() {
      if (!this.enabled) return false;
      if (!globalThis.supabase) {
        throw new Error("Supabase client is unavailable. Check your network connection.");
      }

      this.client = globalThis.supabase.createClient(config.url, config.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      this.user = this.client.auth.getUser ? (await this.client.auth.getUser()).data.user : null;
      this.initialized = true;
      return true;
    }

    async signIn(email, password) {
      if (!this.enabled) throw new Error("Supabase is not configured.");
      await this.initialize();
      const { error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      this.user = (await this.client.auth.getUser()).data.user;
      return this.user;
    }

    async signUp(email, password) {
      if (!this.enabled) throw new Error("Supabase is not configured.");
      await this.initialize();
      const { data, error } = await this.client.auth.signUp({ email, password });
      if (error) throw error;
      this.user = data.user;
      return data.user;
    }

    async signOut() {
      if (!this.client) return;
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
      this.user = null;
    }

    async sync(data) {
      if (!this.enabled || !this.user) return { changed: false, data };

      const { data: existing, error } = await this.client
        .from("calendar_data")
        .select("id, updated_at, records, events, supplements")
        .eq("user_id", this.user.id)
        .maybeSingle();

      if (error) throw error;

      if (!existing) {
        const { error: insertError } = await this.client.from("calendar_data").insert({
          user_id: this.user.id,
          records: data.records,
          events: data.events,
          supplements: data.supplements,
          updated_at: new Date().toISOString()
        });
        if (insertError) throw insertError;
        return { changed: true, data };
      }

      const remoteUpdatedAt = new Date(existing.updated_at).getTime();
      const localUpdatedAt = new Date(data.lastSavedAt).getTime();
      if (remoteUpdatedAt > localUpdatedAt) {
        return {
          changed: true,
          data: {
            records: existing.records || {},
            events: existing.events || {},
            supplements: existing.supplements || [],
            lastSavedAt: existing.updated_at
          }
        };
      }

      const { error: updateError } = await this.client
        .from("calendar_data")
        .update({
          records: data.records,
          events: data.events,
          supplements: data.supplements,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
      if (updateError) throw updateError;
      return { changed: true, data };
    }
  }

  globalThis.DailyRitualSupabase = SupabaseSync;
  globalThis.DAILY_RITUAL_SUPABASE_READY = isConfigured;
})();
