import { supabase } from '@/lib/supabase';

export type Conversation = {
  id: string;
  appointment_id: string;
  institution_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

/**
 * Get or create a conversation for a donation appointment
 */
export async function getOrCreateConversation(
  appointmentId: string,
  institutionId: string,
  userId: string
) {
  console.log('[iDonate:MessageService] getOrCreateConversation', { appointmentId, institutionId, userId });

  // First try to get existing conversation
  let { data: existingConversation, error: fetchError } = await supabase
    .from('conversations')
    .select('*')
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  if (fetchError) {
    console.error('[iDonate:MessageService] Failed to fetch conversation', fetchError);
    return { data: null, error: fetchError };
  }

  if (existingConversation) {
    return { data: existingConversation as Conversation, error: null };
  }

  // Create new conversation if it doesn't exist
  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      appointment_id: appointmentId,
      institution_id: institutionId,
      user_id: userId,
    })
    .select()
    .single();

  if (createError) {
    console.error('[iDonate:MessageService] Failed to create conversation', createError);
    return { data: null, error: createError };
  }

  return { data: newConversation as Conversation, error: null };
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  messageText: string
) {
  console.log('[iDonate:MessageService] sendMessage', { conversationId, senderId });

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      message: messageText,
    })
    .select()
    .single();

  if (error) {
    console.error('[iDonate:MessageService] Failed to send message', error);
  }

  return { data: data as Message | null, error };
}

/**
 * Get all messages for a conversation
 */
export async function getMessages(conversationId: string) {
  console.log('[iDonate:MessageService] getMessages', { conversationId });

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[iDonate:MessageService] Failed to get messages', error);
  }

  return { data: data as Message[] | null, error };
}

/**
 * Subscribe to realtime messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void
) {
  console.log('[iDonate:MessageService] subscribeToMessages', { conversationId });

  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        console.log('[iDonate:MessageService] New message received', payload);
        callback(payload.new as Message);
      }
    )
    .subscribe();
}
