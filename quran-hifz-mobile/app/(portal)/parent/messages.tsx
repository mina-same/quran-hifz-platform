import ConversationsScreen from '@/components/domain/ConversationsScreen';

/** Same as web: the parent «الرسائل» page is the conversations view (system
 *  notifications arrive there as the read-only «system» thread). */
export default function ParentMessages() {
  return <ConversationsScreen threadPath="/(portal)/parent/thread" />;
}
