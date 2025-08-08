const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { validateAuth, validateProjectAccess } = require('./middleware/auth');
const { FieldValue } = require('firebase-admin/firestore');

/**
 * Get chat messages for a board
 * Supports basic pagination via "limit" and "before" (timestamp millis) cursors
 */
exports.getBoardMessages = onCall(async (request) => {
  const userId = validateAuth(request);
  const { boardId, limit = 100, before, after } = request.data || {};

  if (!boardId) {
    throw new HttpsError('invalid-argument', 'Board ID is required');
  }

  const db = admin.firestore();

  try {
    // Resolve projectId from board and validate access
    const boardDoc = await db.collection('boards').doc(boardId).get();
    if (!boardDoc.exists) {
      throw new HttpsError('not-found', 'Board not found');
    }

    const boardData = boardDoc.data();
    await validateProjectAccess(db, boardData.projectId, userId);

    // Build query: messages for board ordered by createdAt descending for pagination
    let query = db
      .collection('board_messages')
      .where('boardId', '==', boardId)
      .orderBy('createdAt', 'desc')
      .limit(Math.max(1, Math.min(100, Number(limit) || 100)));

    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query = query.where('createdAt', '<', admin.firestore.Timestamp.fromDate(beforeDate));
      }
    }
    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        query = query.startAfter(admin.firestore.Timestamp.fromDate(afterDate));
      }
    }

    const snapshot = await query.get();

    // Raw messages (desc order for pagination)
    const messagesDesc = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Return messages in ascending order for display (oldest first),
    // include resolved display fields for immediate UI rendering
    const messages = messagesDesc.reverse().map((msg) => ({
      id: msg.id,
      boardId: msg.boardId,
      projectId: msg.projectId,
      content: msg.content,
      memberUserId: msg.memberUserId,
      memberDisplayName: null, // names are not resolved to avoid N+1 lookups
      memberEmail: msg.memberEmail || null,
      createdAt: msg.createdAt?.toDate?.() || null,
    }));

    return { messages };
  } catch (error) {
    console.error('Error getting board messages:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to get board messages');
  }
});

/**
 * Send a chat message to a board
 */
exports.sendBoardMessage = onCall(async (request) => {
  const userId = validateAuth(request);
  const { boardId, content } = request.data || {};

  if (!boardId || !content || typeof content !== 'string' || content.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'Board ID and non-empty content are required');
  }
  // Basic input limits and sanitization
  const MAX_LEN = 2000;
  // Remove ASCII control chars (0x00-0x1F) and DEL (0x7F) without regex to satisfy linter
  const sanitized = Array.from(content)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return (code >= 0x20 && code !== 0x7f);
    })
    .join('')
    .trim();
  // Unicode normalization and strip zero-width/bidi controls
  const normalized = sanitized.normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '');
  if (normalized.length === 0 || normalized.length > MAX_LEN) {
    throw new HttpsError('invalid-argument', 'message_invalid_length');
  }
  if (sanitized.length === 0 || sanitized.length > MAX_LEN) {
    throw new HttpsError('invalid-argument', `Message must be between 1 and ${MAX_LEN} characters`);
  }

  const db = admin.firestore();

  try {
    // Resolve projectId from board and validate member access
    const boardDoc = await db.collection('boards').doc(boardId).get();
    if (!boardDoc.exists) {
      throw new HttpsError('not-found', 'Board not found');
    }
    const boardData = boardDoc.data();

    await validateProjectAccess(db, boardData.projectId, userId);

    // Resolve sender display info (prefer auth token for emulator compatibility)
    let memberDisplayName = request.auth?.token?.name || request.auth?.token?.displayName || null;
    let memberEmail = request.auth?.token?.email || null;

    // If still missing, try users collection or Auth (may be unavailable in emulator)
    if (!memberDisplayName || !memberEmail) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const d = userDoc.data();
          memberDisplayName = memberDisplayName || d.displayName || d.name || null;
          memberEmail = memberEmail || d.email || null;
        } else {
          const rec = await admin.auth().getUser(userId);
          memberDisplayName = memberDisplayName || rec.displayName || null;
          memberEmail = memberEmail || rec.email || null;
        }
      } catch (_e) {
        // ignore; keep what we have
      }
    }

    const messageRef = db.collection('board_messages').doc();

    // Simple per-user per-board rate limit using a transaction
    const MAX_PER_WINDOW = 10; // messages
    const WINDOW_MS = 30_000; // 30 seconds
    const rateRef = db.collection('rate_limits').doc(`${userId}_send_${boardId}`);
    const boardRef = db.collection('boards').doc(boardId);

    await db.runTransaction(async (tx) => {
      const now = admin.firestore.Timestamp.now();

      // Rate limit check
      const rateDoc = await tx.get(rateRef);
      if (rateDoc.exists) {
        const data = rateDoc.data();
        const windowStart = data.windowStart?.toMillis?.() || 0;
        const count = data.count || 0;
        if (now.toMillis() - windowStart <= WINDOW_MS) {
          if (count >= MAX_PER_WINDOW) {
            throw new HttpsError('resource-exhausted', 'rate_limited');
          }
          tx.update(rateRef, { count: count + 1 });
        } else {
          tx.set(rateRef, { windowStart: now, count: 1 });
        }
      } else {
        tx.set(rateRef, { windowStart: now, count: 1 });
      }

      // Persist memberEmail for simpler display and auditing; resolve name at read time
      tx.set(messageRef, {
        boardId,
        projectId: boardData.projectId,
        content: normalized,
        memberUserId: userId,
        memberEmail: memberEmail || null,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Update board metadata
      tx.update(boardRef, {
        lastMessageAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // board updated in batch above

    // Fetch saved message to return with resolved timestamp
    const saved = await messageRef.get();
    const savedData = saved.data();

    const response = {
      id: saved.id,
      boardId,
      projectId: boardData.projectId,
      content: savedData.content,
      memberUserId: savedData.memberUserId,
      // Resolve at response time rather than persisting
      memberDisplayName: memberDisplayName,
      memberEmail: memberEmail,
      createdAt: savedData.createdAt?.toDate?.() || null,
    };
    return response;
  } catch (error) {
    // Map common errors to stable codes for client handling
    if (error instanceof HttpsError) {
      throw error;
    }
    const msg = typeof error?.message === 'string' ? error.message : 'unknown_error';
    // Hide internals but pass a machine-readable code
    throw new HttpsError('internal', `chat_send_failed:${msg}`);
  }
});


