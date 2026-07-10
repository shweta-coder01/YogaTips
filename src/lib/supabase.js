import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

// Determine if we are running in mock mode (i.e. no Supabase credentials provided)
export const isMockMode = !supabaseUrl || !supabaseAnonKey;

// Mock database storage using browser localStorage
class MockSupabase {
  constructor() {
    this.listeners = [];
    if (typeof window !== 'undefined') {
      // Seed some default profiles if empty
      if (!localStorage.getItem('mock_users')) {
        localStorage.setItem('mock_users', JSON.stringify([]));
      }
      if (!localStorage.getItem('mock_profiles')) {
        localStorage.setItem('mock_profiles', JSON.stringify([]));
      }
      if (!localStorage.getItem('mock_orders')) {
        localStorage.setItem('mock_orders', JSON.stringify([]));
      }
    }
  }

  // Auth methods
  get auth() {
    const self = this;
    return {
      async signUp({ email, phone, password, options }) {
        if (typeof window === 'undefined') return { data: null, error: { message: 'Browser environment required' } };

        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const identifier = email || phone;
        if (!identifier) return { data: null, error: { message: 'Email or phone required' } };

        if (users.find(u => (u.email && u.email.toLowerCase() === (email || '').toLowerCase()) || (u.phone && u.phone === phone))) {
          return { data: null, error: { message: 'User already exists' } };
        }

        const newUser = {
          id: crypto.randomUUID(),
          email: email || null,
          phone: phone || null,
          name: options?.data?.name || 'Yoga Practitioner',
          created_at: new Date().toISOString(),
        };

        // Save user credentials (mock database)
        users.push({ ...newUser, password });
        localStorage.setItem('mock_users', JSON.stringify(users));

        // Create profile
        const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
        profiles.push({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          created_at: newUser.created_at
        });
        localStorage.setItem('mock_profiles', JSON.stringify(profiles));

        // Automatically sign in
        const session = { user: newUser, token: 'mock-jwt-token' };
        localStorage.setItem('mock_session', JSON.stringify(session));
        self._notify(session);

        return { data: { user: newUser, session }, error: null };
      },

      async signInWithPassword({ email, phone, password }) {
        if (typeof window === 'undefined') return { data: null, error: { message: 'Browser environment required' } };

        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const user = users.find(u => {
          const matchIdentifier = email ? (u.email && u.email.toLowerCase() === email.toLowerCase()) : (u.phone && u.phone === phone);
          return matchIdentifier && u.password === password;
        });

        if (!user) {
          return { data: null, error: { message: 'Invalid login credentials' } };
        }

        const session = {
          user: { id: user.id, email: user.email, phone: user.phone, name: user.name, created_at: user.created_at },
          token: 'mock-jwt-token'
        };
        localStorage.setItem('mock_session', JSON.stringify(session));
        self._notify(session);

        return { data: { user: session.user, session }, error: null };
      },

      async signOut() {
        if (typeof window === 'undefined') return { error: null };
        localStorage.removeItem('mock_session');
        self._notify(null);
        return { error: null };
      },

      async getSession() {
        if (typeof window === 'undefined') return { data: { session: null }, error: null };
        const sessionStr = localStorage.getItem('mock_session');
        if (!sessionStr) return { data: { session: null }, error: null };
        return { data: { session: JSON.parse(sessionStr) }, error: null };
      },

      async resetPasswordForEmail(email, options) {
        if (typeof window === 'undefined') return { data: null, error: null };
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
          return { data: {}, error: null };
        }
        
        const resetLink = `${options?.redirectTo || (window.location.origin + '/reset-password')}?token=mock-token-${user.id}`;
        console.log("================================================");
        console.log("SUPABASE SANDBOX - PASSWORD RESET EMAIL");
        console.log(`To: ${email}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log("================================================");
        return { data: {}, error: null };
      },

      async updateUser({ password }) {
        if (typeof window === 'undefined') return { data: null, error: { message: 'Browser required' } };
        
        const sessionStr = localStorage.getItem('mock_session');
        let userId = '';
        
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          userId = session.user.id;
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          const token = urlParams.get('token') || '';
          if (token.startsWith('mock-token-')) {
            userId = token.replace('mock-token-', '');
          }
        }
        
        if (!userId) {
          return { data: null, error: { message: 'Invalid reset session or token expired.' } };
        }
        
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
          return { data: null, error: { message: 'User not found' } };
        }
        
        users[userIndex].password = password;
        localStorage.setItem('mock_users', JSON.stringify(users));
        
        const updatedUser = { 
          id: users[userIndex].id, 
          email: users[userIndex].email, 
          phone: users[userIndex].phone, 
          name: users[userIndex].name, 
          created_at: users[userIndex].created_at 
        };
        const session = { user: updatedUser, token: 'mock-jwt-token' };
        localStorage.setItem('mock_session', JSON.stringify(session));
        self._notify(session);
        
        return { data: { user: updatedUser }, error: null };
      },

      onAuthStateChange(callback) {
        if (typeof window === 'undefined') {
          return { data: { subscription: { unsubscribe() {} } } };
        }
        self.listeners.push(callback);
        // Trigger initial state callback asynchronously
        self.getSession().then(({ data: { session } }) => {
          callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        });
        return {
          data: {
            subscription: {
              unsubscribe() {
                self.listeners = self.listeners.filter(l => l !== callback);
              }
            }
          }
        };
      }
    };
  }

  _notify(session) {
    const event = session ? 'SIGNED_IN' : 'SIGNED_OUT';
    this.listeners.forEach(l => l(event, session));
  }

  // Database query methods
  from(tableName) {
    return {
      select(queryStr = '*') {
        return {
          eq(column, value) {
            return {
              async single() {
                if (typeof window === 'undefined') return { data: null, error: { message: 'Browser required' } };
                const data = JSON.parse(localStorage.getItem(`mock_${tableName}`) || '[]');
                const item = data.find(i => i[column] === value);
                if (!item) return { data: null, error: { message: 'Row not found' } };
                return { data: item, error: null };
              },
              // Allow standard promise resolution (.then) or async-await
              then(resolve) {
                if (typeof window === 'undefined') return resolve({ data: [], error: null });
                const data = JSON.parse(localStorage.getItem(`mock_${tableName}`) || '[]');
                const items = data.filter(i => i[column] === value);
                resolve({ data: items, error: null });
              }
            };
          },
          then(resolve) {
            if (typeof window === 'undefined') return resolve({ data: [], error: null });
            const data = JSON.parse(localStorage.getItem(`mock_${tableName}`) || '[]');
            resolve({ data, error: null });
          }
        };
      },

      insert(row) {
        return {
          then(resolve) {
            if (typeof window === 'undefined') return resolve({ data: null, error: null });
            const data = JSON.parse(localStorage.getItem(`mock_${tableName}`) || '[]');
            const rows = Array.isArray(row) ? row : [row];
            const rowsWithId = rows.map(r => ({
              id: r.id || crypto.randomUUID(),
              purchase_date: new Date().toISOString(),
              ...r
            }));
            const updated = [...data, ...rowsWithId];
            localStorage.setItem(`mock_${tableName}`, JSON.stringify(updated));
            resolve({ data: rowsWithId, error: null });
          }
        };
      },

      update(updates) {
        return {
          eq(column, value) {
            return {
              then(resolve) {
                if (typeof window === 'undefined') return resolve({ data: null, error: null });
                const data = JSON.parse(localStorage.getItem(`mock_${tableName}`) || '[]');
                let updatedItem = null;
                const updated = data.map(item => {
                  if (item[column] === value) {
                    updatedItem = { ...item, ...updates };
                    return updatedItem;
                  }
                  return item;
                });
                localStorage.setItem(`mock_${tableName}`, JSON.stringify(updated));
                
                // If profiles table, sync back to logged in user session metadata
                if (tableName === 'profiles' && updatedItem) {
                  const sessionStr = localStorage.getItem('mock_session');
                  if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    if (session.user.id === value) {
                      session.user.name = updatedItem.name;
                      localStorage.setItem('mock_session', JSON.stringify(session));
                    }
                  }
                }
                
                resolve({ data: updatedItem, error: null });
              }
            };
          }
        };
      }
    };
  }
}

export const supabase = isMockMode
  ? new MockSupabase()
  : createClient(supabaseUrl, supabaseAnonKey);
