import { Router } from 'express';
import { supabase, requireAuth } from '../supabase.js';

const router = Router();

// Get all conversations for the user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, pinned, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ conversations: data });
  } catch (err) {
    console.error('Fetch conversations error:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get a single conversation with messages
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('role, content, reasoning, model_label, created_at')
      .eq('conversation_id', req.params.id)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    res.json({
      conversation: {
        ...conversation,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          reasoning: m.reasoning || undefined,
          modelLabel: m.model_label || undefined,
        })),
      },
    });
  } catch (err) {
    console.error('Fetch conversation error:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Create a new conversation
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;

    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: req.user.id, title: title || 'New conversation' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ conversation: data });
  } catch (err) {
    console.error('Create conversation error:', err.message);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Update conversation (title, pinned)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { title, pinned } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (pinned !== undefined) updates.pinned = pinned;

    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ conversation: data });
  } catch (err) {
    console.error('Update conversation error:', err.message);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete a conversation
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Delete conversation error:', err.message);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Save messages to a conversation
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages?.length) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    // Verify ownership
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (convError || !conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const rows = messages.map((m) => ({
      conversation_id: req.params.id,
      role: m.role,
      content: m.content || '',
      reasoning: m.reasoning || null,
      model_label: m.modelLabel || null,
    }));

    const { error } = await supabase.from('messages').insert(rows);
    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Save messages error:', err.message);
    res.status(500).json({ error: 'Failed to save messages' });
  }
});

export default router;
