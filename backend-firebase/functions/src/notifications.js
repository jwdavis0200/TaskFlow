const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

/**
 * Send notification when task status changes
 */
exports.sendTaskNotification = onDocumentUpdated('tasks/{taskId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const taskId = event.params.taskId;
  
  // Check if status changed
  if (before.status !== after.status) {
    try {
      const messaging = admin.messaging();
      const db = admin.firestore();
      
      // Get project members to notify
      const projectDoc = await db.collection('projects').doc(after.projectId).get();
      if (!projectDoc.exists) {
        console.log('Project not found for task notification');
        return;
      }
      
      const projectData = projectDoc.data();
      const notifications = [];
      
      // Send notification to all project members except the person who made the change
      for (const memberId of projectData.members) {
        if (memberId !== after.assignedTo) {
          const userDoc = await db.collection('users').doc(memberId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            if (userData.fcmToken) {
              notifications.push({
                token: userData.fcmToken,
                notification: {
                  title: 'Task Updated',
                  body: `Task "${after.title}" moved to ${after.status}`
                },
                data: {
                  taskId: taskId,
                  projectId: after.projectId,
                  boardId: after.boardId,
                  type: 'task_status_change'
                }
              });
            }
          }
        }
      }
      
      if (notifications.length > 0) {
        await messaging.sendAll(notifications);
        console.log(`Sent ${notifications.length} task update notifications`);
      }
    } catch (error) {
      console.error('Error sending task notification:', error);
    }
  }
});

/**
 * Send daily due date reminders
 */
exports.sendDueDateReminder = onSchedule('every day 09:00', async (_event) => {
  try {
    const db = admin.firestore();
    const messaging = admin.messaging();
    
    // Get tasks due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tasksSnapshot = await db.collection('tasks')
      .where('dueDate', '>=', Timestamp.fromDate(today))
      .where('dueDate', '<', Timestamp.fromDate(tomorrow))
      .where('isCompleted', '==', false)
      .get();
    
    const notifications = [];
    
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      
      if (taskData.assignedTo) {
        const userDoc = await db.collection('users').doc(taskData.assignedTo).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          
          if (userData.fcmToken) {
            notifications.push({
              token: userData.fcmToken,
              notification: {
                title: 'Task Due Today',
                body: `Don't forget: "${taskData.title}" is due today!`
              },
              data: {
                taskId: taskDoc.id,
                projectId: taskData.projectId,
                boardId: taskData.boardId,
                type: 'due_date_reminder'
              }
            });
          }
        }
      }
    }
    
    if (notifications.length > 0) {
      await messaging.sendAll(notifications);
      console.log(`Sent ${notifications.length} due date reminder notifications`);
    }
    
    return null;
  } catch (error) {
    console.error('Error sending due date reminders:', error);
    return null;
  }
});