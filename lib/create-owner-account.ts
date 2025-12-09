// Helper function to create owner account with username support
import { supabase } from './supabase'

export async function createOwnerAccount(username: string, email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    // Create auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        username: username,
        role: 'owner'
      },
      email_confirm: true
    })

    if (error) throw error

    return { success: true, user: data.user }
  } catch (error) {
    console.error('Error creating owner account:', error)
    return { success: false, error }
  }
}

// Alternative: Create account with username as email format
export async function createOwnerAccountSimple(username: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const email = `${username}@smokieshamburgers.local`
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          role: 'owner'
        }
      }
    })

    if (error) throw error

    return { success: true, user: data.user, email }
  } catch (error) {
    console.error('Error creating owner account:', error)
    return { success: false, error }
  }
}