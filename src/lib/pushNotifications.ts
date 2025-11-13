import { supabase } from '@/integrations/supabase/client';

export interface SendPushNotificationParams {
  userId: string;
  title: string;
  body: string;
  type?: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Send a push notification to a specific user
 */
export const sendPushNotification = async (params: SendPushNotificationParams) => {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: params.userId,
        title: params.title,
        body: params.body,
        data: {
          type: params.type || 'general',
          url: params.url,
          ...params.data,
        },
      },
    });

    if (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }

    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw error;
  }
};

/**
 * Helper functions for common notification types
 */

export const notifyNewChallenge = async (userId: string, challengeTitle: string, challengeId: string) => {
  return sendPushNotification({
    userId,
    title: 'New Challenge Available! 🎯',
    body: `Check out the new challenge: ${challengeTitle}`,
    type: 'new_challenge',
    url: `/challenge/${challengeId}`,
    data: { challenge_id: challengeId },
  });
};

export const notifySubmissionApproved = async (userId: string, challengeTitle: string, points: number) => {
  return sendPushNotification({
    userId,
    title: 'Submission Approved! ✅',
    body: `Your submission for "${challengeTitle}" was approved! You earned ${points} points.`,
    type: 'submission_approved',
    url: '/profile',
    data: { points },
  });
};

export const notifySubmissionRejected = async (userId: string, challengeTitle: string, reason?: string) => {
  return sendPushNotification({
    userId,
    title: 'Submission Needs Review',
    body: reason || `Your submission for "${challengeTitle}" needs to be revised.`,
    type: 'submission_rejected',
    url: '/profile',
  });
};

export const notifyPrizeWon = async (userId: string, prize: string, challengeTitle: string) => {
  return sendPushNotification({
    userId,
    title: 'You Won a Prize! 🏆',
    body: `Congratulations! You won ${prize} in ${challengeTitle}`,
    type: 'prize_won',
    url: '/profile',
    data: { prize },
  });
};

export const notifyRankingChange = async (userId: string, newRank: number, oldRank: number) => {
  const improved = newRank < oldRank;
  return sendPushNotification({
    userId,
    title: improved ? 'Ranking Up! 📈' : 'Ranking Update',
    body: improved
      ? `Great job! You moved up to #${newRank} on the leaderboard!`
      : `Your leaderboard rank is now #${newRank}`,
    type: 'ranking_change',
    url: '/leaderboard',
    data: { new_rank: newRank, old_rank: oldRank },
  });
};

export const notifyBadgeEarned = async (userId: string, badgeName: string) => {
  return sendPushNotification({
    userId,
    title: 'New Badge Earned! 🎖️',
    body: `You've unlocked the "${badgeName}" badge!`,
    type: 'badge_earned',
    url: '/profile',
    data: { badge_name: badgeName },
  });
};

export const notifyFollower = async (userId: string, followerName: string) => {
  return sendPushNotification({
    userId,
    title: 'New Follower! 👋',
    body: `${followerName} started following you`,
    type: 'new_follower',
    url: '/profile',
  });
};
